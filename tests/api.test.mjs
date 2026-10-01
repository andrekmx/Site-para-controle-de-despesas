import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request as httpRequest } from 'node:http'
import { once } from 'node:events'
import { createApp } from '../Backend/index.js'
import { LedgerStore } from '../Backend/store.js'

test('API rejeita CSRF, JSON inválido, excesso de dados e versões antigas', async () => {
  const store = new LedgerStore(':memory:')
  let app
  const server = createServer((req, res) => app(req, res))
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = server.address().port
  app = createApp(store, { port })
  const origin = `http://127.0.0.1:${port}`
  const headers = { Origin: origin, 'Content-Type': 'application/json', 'If-Match': '"0"' }
  try {
    let response = await fetch(`${origin}/api/livro`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('x-powered-by'), null)
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers: { ...headers, Origin: 'https://attacker.example' }, body: '{"name":"Ana"}' })
    assert.equal(response.status, 403)
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"name":"Ana"}' })
    assert.equal(response.status, 403)
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers, body: 'oops' })
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { error: 'JSON inválido.' })
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers, body: JSON.stringify({ name: 'x'.repeat(20000) }) })
    assert.equal(response.status, 413)
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{"name":"Ana"}' })
    assert.equal(response.status, 428)
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers, body: '{"name":"Ana"}' })
    assert.equal(response.status, 201)
    const book = await response.json()
    assert.equal(book.people[0].name, 'Ana')
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers, body: '{"name":"Bruno"}' })
    assert.equal(response.status, 409)
    response = await fetch(`${origin}/api/pessoas`, { method: 'POST', headers: { ...headers, 'If-Match': '"1"' }, body: '{"name":"Bruno","role":"admin"}' })
    assert.equal(response.status, 400)
    response = await fetch(`${origin}/api/pessoas/not-an-id`, { method: 'DELETE', headers: { ...headers, 'If-Match': '"1"' } })
    assert.equal(response.status, 400)
    const hostileHostStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(`${origin}/api/livro`, { headers: { Host: 'attacker.example' } }, result => { result.resume(); resolve(result.statusCode) })
      request.on('error', reject)
      request.end()
    })
    assert.equal(hostileHostStatus, 403)
    response = await fetch(`${origin}/api/gastos`, { method: 'POST', headers: { ...headers, 'If-Match': '"1"' }, body: JSON.stringify({ description: 'Almoço', amountCents: 150, payerId: book.people[0].id, participantIds: [book.people[0].id], date: '2026-01-01' }) })
    assert.equal(response.status, 201)
    const afterExpense = await response.json()
    const expense = afterExpense.expenses[0]
    response = await fetch(`${origin}/api/gastos/${expense.id}`, { method: 'PUT', headers: { ...headers, 'If-Match': '"2"' }, body: JSON.stringify({ description: 'Almoço editado', amountCents: 200, payerId: expense.payerId, participantIds: expense.participantIds, date: expense.date }) })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).expenses[0].amountCents, 200)
    response = await fetch(`${origin}/api/gastos/${expense.id}`, { method: 'DELETE', headers: { ...headers, 'If-Match': '"3"' } })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).expenses.length, 0)
  } finally {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    store.close()
  }
})
