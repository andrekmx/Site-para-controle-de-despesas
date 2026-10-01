import express from 'express'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { LedgerStore, ConflictError, NotFoundError } from './store.js'
import { ValidationError } from '../shared/ledger.mjs'

const backendDirectory = dirname(fileURLToPath(import.meta.url))

/** Cria a API local com armazenamento injetado, sem acesso externo. */
export function createApp(store, { port = 3000, frontendPort = 5173, logger = console } = {}) {
  const app = express()
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`])
  const origins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://localhost:${frontendPort}`, `http://127.0.0.1:${frontendPort}`])
  app.disable('x-powered-by')
  let requests = 0
  let windowStart = Date.now()
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store',
    })
    if (!hosts.has(req.headers.host) || (req.headers.origin && !origins.has(req.headers.origin))) return res.status(403).json({ error: 'Origem não permitida.' })
    if (Date.now() - windowStart >= 60000) { requests = 0; windowStart = Date.now() }
    if (++requests > 600) {
      res.set('Retry-After', '60')
      return res.status(429).json({ error: 'Muitas solicitações. Aguarde um minuto.' })
    }
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !origins.has(req.headers.origin)) return res.status(403).json({ error: 'Origem não permitida.' })
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ error: 'Envie os dados em formato JSON.' })
    next()
  })
  app.use(express.json({ limit: '16kb', strict: true }))
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.get('/api/livro', (_req, res) => res.json(store.read()))
  app.get('/api/pessoas', (_req, res) => res.json(store.read().people))
  app.get('/api/gastos', (_req, res) => res.json(store.read().expenses))
  app.get('/api/saldos', (_req, res) => {
    const { balances, transfers } = store.read()
    res.json({ balances, transfers })
  })
  app.use('/api', (req, res, next) => {
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next()
    const match = /^"(\d{1,12})"$/u.exec(req.headers['if-match'] || '')
    if (!match) return res.status(428).json({ error: 'Atualize o livro antes de salvar.' })
    req.bookRevision = Number(match[1])
    next()
  })
  app.param('id', (req, res, next, id) => {
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu.test(id)) return res.status(400).json({ error: 'Identificador inválido.' })
    next()
  })
  app.post('/api/pessoas', (req, res) => res.status(201).json(store.addPerson(req.body, req.bookRevision)))
  app.delete('/api/pessoas/:id', (req, res) => res.json(store.removePerson(req.params.id, req.bookRevision)))
  app.post('/api/gastos', (req, res) => res.status(201).json(store.saveExpense(req.body, req.bookRevision)))
  app.put('/api/gastos/:id', (req, res) => res.json(store.saveExpense(req.body, req.bookRevision, req.params.id)))
  app.delete('/api/gastos/:id', (req, res) => res.json(store.removeExpense(req.params.id, req.bookRevision)))
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }))
  const frontendDirectory = resolve(backendDirectory, '../Frontend/dist')
  if (existsSync(frontendDirectory)) {
    app.use(express.static(frontendDirectory, { dotfiles: 'deny' }))
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(frontendDirectory, 'index.html')))
  }
  app.use((_req, res) => res.status(404).json({ error: 'Recurso não encontrado.' }))
  app.use((error, _req, res, _next) => {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message })
    if (error instanceof ConflictError) return res.status(409).json({ error: error.message })
    if (error instanceof NotFoundError) return res.status(404).json({ error: error.message })
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' })
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Dados enviados excedem o limite permitido.' })
    logger.error(JSON.stringify({ event: 'request_failed', errorType: error.name, stack: error.stack }))
    res.status(500).json({ error: 'Não foi possível concluir a operação. Tente novamente.' })
  })
  return app
}

/** Inicia no loopback e fecha SQLite no desligamento. */
export function startServer() {
  const port = Number(process.env.PORT || 3000)
  const frontendPort = Number(process.env.FRONTEND_PORT || 5173)
  if (![port, frontendPort].every(value => Number.isInteger(value) && value >= 1024 && value <= 65535)) throw new Error('PORT e FRONTEND_PORT devem ser portas entre 1024 e 65535.')
  const databasePath = resolve(process.env.DATABASE_PATH || resolve(backendDirectory, 'data/livro.sqlite'))
  mkdirSync(dirname(databasePath), { recursive: true })
  const store = new LedgerStore(databasePath)
  const server = createApp(store, { port, frontendPort }).listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'server_started', url: `http://127.0.0.1:${port}` })))
  server.on('error', error => {
    console.error(JSON.stringify({ event: 'server_failed', errorType: error.code }))
    store.close()
    process.exitCode = 1
  })
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => store.close()))
  return server
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) startServer()

