import { useCallback, useEffect, useRef, useState } from 'react'
import { requestBook, ApiError } from './api'
import { validateText } from '../../shared/ledger.mjs'
import { formatMoney } from './format'
import PeoplePanel from './components/PeoplePanel'
import ExpenseForm from './components/ExpenseForm'
import SettlementPanel from './components/SettlementPanel'
import ExpenseHistory from './components/ExpenseHistory'
import './App.css'

/** Coordena o livro local, mensagens e alterações confirmadas pela API. */
export default function App() {
  const [book, setBook] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingExpense, setEditingExpense] = useState(null)
  const operationInProgress = useRef(false)
  const load = useCallback(async () => {
    try { const data = await requestBook(); setBook(data); setError(''); return true }
    catch (loadError) { setError(loadError.message); return false }
  }, [])
  useEffect(() => {
    let active = true
    requestBook().then(data => { if (active) setBook(data) }).catch(loadError => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [])

  async function mutate(path, method, body, message) {
    if (operationInProgress.current || !book) return false
    operationInProgress.current = true
    setBusy(true); setError(''); setNotice('')
    try {
      setBook(await requestBook(path, { method, body, revision: book.revision }))
      setNotice(message)
      return true
    } catch (mutationError) {
      if (mutationError instanceof ApiError && [0, 409, 404].includes(mutationError.status)) await load()
      setError(mutationError.message)
      return false
    } finally { operationInProgress.current = false; setBusy(false) }
  }

  async function addPerson(name) {
    try { return await mutate('/api/pessoas', 'POST', { name: validateText(name, 'Nome', 80) }, 'Pessoa adicionada ao livro.') }
    catch (validationError) { setError(validationError.message); return false }
  }
  async function saveExpense(data, id) {
    const saved = await mutate(id ? `/api/gastos/${id}` : '/api/gastos', id ? 'PUT' : 'POST', data, id ? 'Despesa atualizada. Os saldos foram recalculados.' : 'Despesa registrada. Os saldos foram recalculados.')
    if (saved) setEditingExpense(null)
    return saved
  }
  async function removePerson(person) {
    if (window.confirm(`Remover ${person.name} do livro?`)) await mutate(`/api/pessoas/${person.id}`, 'DELETE', undefined, 'Pessoa removida.')
  }
  async function removeExpense(expense) {
    if (window.confirm(`Excluir a despesa “${expense.description}”? Os saldos serão recalculados.`)) {
      if (await mutate(`/api/gastos/${expense.id}`, 'DELETE', undefined, 'Despesa excluída. Os saldos foram recalculados.')) {
        if (editingExpense?.id === expense.id) setEditingExpense(null)
      }
    }
  }
  async function refresh() {
    if (operationInProgress.current) return
    operationInProgress.current = true; setBusy(true); setNotice('')
    try { if (await load()) setNotice('Livro atualizado.') }
    finally { operationInProgress.current = false; setBusy(false) }
  }
  function editExpense(expense) {
    setEditingExpense(expense)
    document.getElementById('expense-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const totalCents = book?.expenses.reduce((total, expense) => total + expense.amountCents, 0) || 0
  const dueCents = book?.balances.reduce((total, person) => total + Math.max(0, person.balanceCents), 0) || 0
  return <>
    <header className="topo"><div className="header-inner"><div className="brand-mark" aria-hidden="true">LC</div><div><span className="eyebrow">CONTAS COMPARTILHADAS, EM ORDEM</span><h1>Livro de contas</h1><p>Registre os gastos. Divida com clareza. Acerte as contas.</p></div><span className="local-badge">Livro local</span></div></header>
    <main className="conteudo">
      <div className="page-intro"><div><span className="eyebrow">O LIVRO DO SEU GRUPO</span><h2>Uma conta clara para todos.</h2></div><button className="secondary" disabled={busy} onClick={refresh}>Atualizar livro</button></div>
      {error && <div role="alert" className="message error">{error}{!book && <button className="secondary" disabled={busy} onClick={refresh}>Tentar novamente</button>}</div>}
      {notice && <div role="status" className="message success">{notice}</div>}
      {!book ? !error && <p role="status" className="empty">Abrindo seu livro…</p> : <>
        <section className="summary-cards" aria-label="Resumo do livro"><div><span>Total registrado</span><strong>{formatMoney(totalCents)}</strong><small>{book.expenses.length} lançamento{book.expenses.length === 1 ? '' : 's'}</small></div><div><span>A acertar no grupo</span><strong>{formatMoney(dueCents)}</strong><small>{book.transfers.length} acerto{book.transfers.length === 1 ? '' : 's'} sugerido{book.transfers.length === 1 ? '' : 's'}</small></div><div><span>Pessoas no livro</span><strong>{String(book.people.length).padStart(2, '0')}</strong><small>Um lugar para cada participante</small></div></section>
        <div className="ledger-grid"><PeoplePanel book={book} busy={busy} onAdd={addPerson} onRemove={removePerson} /><SettlementPanel book={book} /></div>
        <ExpenseForm key={editingExpense?.id || 'new'} people={book.people} expense={editingExpense} busy={busy} onSave={saveExpense} onCancel={() => setEditingExpense(null)} />
        <ExpenseHistory book={book} busy={busy} onEdit={editExpense} onRemove={removeExpense} />
      </>}
      <footer>Livro de contas <span aria-hidden="true">·</span> Seus registros ficam no banco de dados desta máquina.</footer>
    </main>
  </>
}
