import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMoney, splitEqually, calculateBalances, simplifyDebts, validateExpense, validateDate, ValidationError } from '../shared/ledger.mjs'

test('dinheiro aceita decimais exatos e rejeita entradas abusivas', () => {
  assert.equal(parseMoney('0,01'), 1)
  assert.equal(parseMoney('1000000.00'), 100000000)
  assert.equal(parseMoney('25,9'), 2590)
  for (const value of ['', '0', '-1', '1e3', 'NaN', 'Infinity', '1.234,56', '0,001', '1000000,01', {}, '<script>']) assert.throws(() => parseMoney(value), ValidationError)
})

test('divisão conserva centavos em limites e centenas de casos', () => {
  assert.deepEqual(splitEqually(100, ['a', 'b', 'c']).map(share => share.amountCents), [34, 33, 33])
  for (let count = 1; count <= 100; count++) {
    const ids = Array.from({ length: count }, (_, index) => String(index))
    for (const amount of [1, count - 1 || 1, count, count + 1, 99999999, 100000000]) {
      const shares = splitEqually(amount, ids)
      assert.equal(shares.reduce((sum, share) => sum + share.amountCents, 0), amount)
      assert.ok(shares.every(share => Number.isInteger(share.amountCents) && share.amountCents >= 0))
      assert.ok(Math.max(...shares.map(share => share.amountCents)) - Math.min(...shares.map(share => share.amountCents)) <= 1)
    }
  }
  for (const ids of [[], ['a', 'a'], [''], [null]]) assert.throws(() => splitEqually(100, ids), ValidationError)
})

test('pagador fora da divisão e acertos zeram os saldos', () => {
  const people = ['a', 'b', 'c', 'd'].map(id => ({ id, name: id }))
  const expenses = [validateExpense({ description: 'Mercado', amountCents: 101, payerId: 'a', participantIds: ['c', 'b'], date: '2026-01-01' }, people), validateExpense({ description: 'Casa', amountCents: 202, payerId: 'd', participantIds: ['a', 'b', 'c', 'd'], date: '2026-01-01' }, people)]
  const balances = calculateBalances(people, expenses)
  assert.equal(balances.reduce((sum, person) => sum + person.balanceCents, 0), 0)
  const remaining = new Map(balances.map(person => [person.id, person.balanceCents]))
  for (const transfer of simplifyDebts(balances)) {
    assert.ok(transfer.amountCents > 0)
    remaining.set(transfer.fromId, remaining.get(transfer.fromId) + transfer.amountCents)
    remaining.set(transfer.toId, remaining.get(transfer.toId) - transfer.amountCents)
  }
  assert.ok([...remaining.values()].every(value => value === 0))
})

test('datas e referências desconhecidas são rejeitadas', () => {
  for (const date of ['2026-02-30', '2026-13-01', '2026-1-01', '1899-01-01', '9999-01-01']) assert.throws(() => validateDate(date), ValidationError)
  const people = [{ id: 'a', name: 'Ana' }]
  const base = { description: 'Almoço', amountCents: 100, payerId: 'a', participantIds: ['a'], date: '2026-01-01' }
  for (const input of [{ ...base, payerId: 'x' }, { ...base, participantIds: ['x'] }, { ...base, amountCents: 1.1 }, { ...base, shares: [] }, { ...base, description: ' '.repeat(20) }]) assert.throws(() => validateExpense(input, people), ValidationError)
})
