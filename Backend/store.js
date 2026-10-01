import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { MAX_PEOPLE, MAX_EXPENSES, ValidationError, validateText, validateFields, validateExpense, calculateBalances, simplifyDebts } from '../shared/ledger.mjs'

/** Conflito de versão ou referência em uso, com mensagem segura. */
export class ConflictError extends Error {}
/** Recurso inexistente. */
export class NotFoundError extends Error {}

/** Repositório de um livro local com SQL parametrizado e transações. */
export class LedgerStore {
  /** @param {string} filename Caminho SQLite ou :memory: para testes. */
  constructor(filename) {
    this.database = new DatabaseSync(filename, { timeout: 5000 })
    this.database.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL) STRICT;
      INSERT OR IGNORE INTO metadata VALUES (1, 0);
      CREATE TABLE IF NOT EXISTS people (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT NOT NULL UNIQUE) STRICT;
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, description TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0 AND amount_cents <= 100000000),
        payer_id TEXT NOT NULL REFERENCES people(id), date TEXT NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS shares (
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        person_id TEXT NOT NULL REFERENCES people(id), amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
        position INTEGER NOT NULL, PRIMARY KEY(expense_id, person_id)
      ) STRICT;
      CREATE INDEX IF NOT EXISTS shares_person ON shares(person_id);
      CREATE INDEX IF NOT EXISTS expenses_payer ON expenses(payer_id);
    `)
  }

  /** @returns {object} Livro completo com saldos e acertos derivados. */
  read() {
    const people = this.database.prepare('SELECT id, name FROM people ORDER BY rowid').all()
    const allocations = this.database.prepare('SELECT expense_id, person_id, amount_cents FROM shares ORDER BY expense_id, position').all()
    const byExpense = new Map()
    for (const row of allocations) {
      if (!byExpense.has(row.expense_id)) byExpense.set(row.expense_id, [])
      byExpense.get(row.expense_id).push({ personId: row.person_id, amountCents: row.amount_cents })
    }
    const expenses = this.database.prepare('SELECT id, description, amount_cents, payer_id, date FROM expenses ORDER BY date DESC, rowid DESC').all().map(row => {
      const shares = byExpense.get(row.id) || []
      return { id: row.id, description: row.description, amountCents: row.amount_cents, payerId: row.payer_id, date: row.date, shares, participantIds: shares.map(share => share.personId) }
    })
    const balances = calculateBalances(people, expenses)
    return { revision: this.database.prepare('SELECT revision FROM metadata WHERE id = 1').get().revision, people, expenses, balances, transfers: simplifyDebts(balances) }
  }

  /** Executa uma alteração contra a revisão esperada, sem perder atualizações. */
  mutate(expectedRevision, operation) {
    this.database.exec('BEGIN IMMEDIATE')
    try {
      const book = this.read()
      if (book.revision !== expectedRevision) throw new ConflictError('O livro mudou em outra janela. Os dados foram atualizados; confira e tente novamente.')
      operation(book)
      this.database.prepare('UPDATE metadata SET revision = revision + 1 WHERE id = 1').run()
      const result = this.read()
      this.database.exec('COMMIT')
      return result
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  /** Insere uma pessoa com nome único e devolve o livro atualizado. */
  addPerson(input, revision) {
    validateFields(input, ['name'])
    const name = validateText(input.name, 'Nome', 80)
    const normalizedName = name.toLocaleLowerCase('pt-BR')
    return this.mutate(revision, book => {
      if (book.people.length >= MAX_PEOPLE) throw new ValidationError('O livro permite até 100 pessoas.')
      if (book.people.some(person => person.name.toLocaleLowerCase('pt-BR') === normalizedName)) throw new ConflictError('Já existe uma pessoa com esse nome.')
      this.database.prepare('INSERT INTO people (id, name, normalized_name) VALUES (?, ?, ?)').run(randomUUID(), name, normalizedName)
    })
  }

  /** Remove apenas pessoas que não estejam associadas a despesas. */
  removePerson(id, revision) {
    return this.mutate(revision, book => {
      if (!book.people.some(person => person.id === id)) throw new NotFoundError('Pessoa não encontrada.')
      if (book.expenses.some(expense => expense.payerId === id || expense.participantIds.includes(id))) throw new ConflictError('Essa pessoa participa de despesas. Edite ou exclua esses lançamentos antes de removê-la.')
      this.database.prepare('DELETE FROM people WHERE id = ?').run(id)
    })
  }

  /** Cria ou substitui uma despesa e suas cotas atomicamente. */
  saveExpense(input, revision, id = null) {
    return this.mutate(revision, book => {
      if (id && !book.expenses.some(expense => expense.id === id)) throw new NotFoundError('Despesa não encontrada.')
      if (!id && book.expenses.length >= MAX_EXPENSES) throw new ValidationError('O livro permite até 10.000 despesas.')
      const expense = validateExpense(input, book.people)
      const expenseId = id || randomUUID()
      if (id) {
        this.database.prepare('UPDATE expenses SET description = ?, amount_cents = ?, payer_id = ?, date = ? WHERE id = ?').run(expense.description, expense.amountCents, expense.payerId, expense.date, expenseId)
        this.database.prepare('DELETE FROM shares WHERE expense_id = ?').run(expenseId)
      } else {
        this.database.prepare('INSERT INTO expenses (id, description, amount_cents, payer_id, date) VALUES (?, ?, ?, ?, ?)').run(expenseId, expense.description, expense.amountCents, expense.payerId, expense.date)
      }
      const insert = this.database.prepare('INSERT INTO shares (expense_id, person_id, amount_cents, position) VALUES (?, ?, ?, ?)')
      expense.shares.forEach((share, position) => insert.run(expenseId, share.personId, share.amountCents, position))
    })
  }

  /** Exclui uma despesa e suas cotas através da chave estrangeira. */
  removeExpense(id, revision) {
    return this.mutate(revision, book => {
      if (!book.expenses.some(expense => expense.id === id)) throw new NotFoundError('Despesa não encontrada.')
      this.database.prepare('DELETE FROM expenses WHERE id = ?').run(id)
    })
  }

  /** Fecha a conexão em desligamentos e testes. */
  close() { this.database.close() }
}
