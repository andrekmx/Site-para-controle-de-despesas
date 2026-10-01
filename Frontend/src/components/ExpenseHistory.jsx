import { useState } from 'react'
import { formatDate, formatMoney } from '../format'

/** Histórico paginado com edição, exclusão e detalhamento das cotas. */
export default function ExpenseHistory({ book, busy, onEdit, onRemove }) {
  const [page, setPage] = useState(0)
  const names = new Map(book.people.map(person => [person.id, person.name]))
  const pageCount = Math.ceil(book.expenses.length / 20)
  const currentPage = Math.min(page, Math.max(0, pageCount - 1))
  const expenses = book.expenses.slice(currentPage * 20, (currentPage + 1) * 20)
  return <section className="panel history-panel" aria-labelledby="history-title">
    <div className="section-heading"><h2 id="history-title">Histórico de lançamentos</h2><span className="count">{book.expenses.length}</span></div>
    {!expenses.length ? <p className="empty">Nenhuma despesa registrada. Seu livro começa no próximo lançamento.</p> : <ul className="expense-list">{expenses.map(expense => <li key={expense.id}>
      <div className="expense-main"><div><small>{formatDate(expense.date)}</small><h3>{expense.description}</h3><p>Pago por <strong>{names.get(expense.payerId)}</strong> · {expense.participantIds.length} participante{expense.participantIds.length === 1 ? '' : 's'}</p></div><strong className="expense-value">{formatMoney(expense.amountCents)}</strong></div>
      <div className="expense-bottom"><details><summary>Ver divisão</summary><ul>{expense.shares.map(share => <li key={share.personId}>{names.get(share.personId)}<strong>{formatMoney(share.amountCents)}</strong></li>)}</ul></details><div className="row-actions"><button type="button" className="text-button" disabled={busy} onClick={() => onEdit(expense)}>Editar</button><button type="button" className="text-button danger" disabled={busy} onClick={() => onRemove(expense)}>Excluir</button></div></div>
    </li>)}</ul>}
    {pageCount > 1 && <nav className="pagination" aria-label="Páginas do histórico"><button className="secondary" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage + 1} de {pageCount}</span><button className="secondary" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav>}
  </section>
}
