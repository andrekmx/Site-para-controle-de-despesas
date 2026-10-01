import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LedgerStore, ConflictError } from '../Backend/store.js'

test('SQLite persiste, recalcula edições, impede exclusão em uso e desfaz operações inválidas', () => {
  const directory = mkdtempSync(join(tmpdir(), 'livro-test-'))
  let store = new LedgerStore(join(directory, 'test.sqlite'))
  try {
    let book = store.addPerson({ name: ' Ana ' }, 0)
    book = store.addPerson({ name: "Bruno'); DROP TABLE people;--" }, book.revision)
    const [ana, bruno] = book.people
    assert.equal(ana.name, 'Ana')
    assert.throws(() => store.addPerson({ name: 'ANA' }, book.revision), ConflictError)
    assert.throws(() => store.addPerson({ name: 'Carlos' }, 0), ConflictError)
    const input = { description: '<img src=x onerror=alert(1)>', amountCents: 101, payerId: ana.id, participantIds: [ana.id, bruno.id], date: '2026-01-01' }
    book = store.saveExpense(input, book.revision)
    assert.equal(book.balances[0].balanceCents, 50)
    assert.throws(() => store.removePerson(ana.id, book.revision), ConflictError)
    assert.throws(() => store.saveExpense({ ...input, participantIds: ['unknown'] }, book.revision))
    assert.equal(store.read().revision, book.revision)
    book = store.saveExpense({ ...input, amountCents: 200, payerId: bruno.id }, book.revision, book.expenses[0].id)
    assert.equal(book.balances[0].balanceCents, -100)
    store.close()
    store = new LedgerStore(join(directory, 'test.sqlite'))
    assert.deepEqual(store.read(), book)
    book = store.removeExpense(book.expenses[0].id, book.revision)
    assert.ok(book.balances.every(person => person.balanceCents === 0))
    book = store.removePerson(bruno.id, book.revision)
    assert.equal(book.people.length, 1)
  } finally {
    store.close()
    for (const filename of readdirSync(directory)) rmSync(join(directory, filename))
    rmdirSync(directory)
  }
})
