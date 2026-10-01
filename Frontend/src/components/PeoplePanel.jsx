import { useState } from 'react'
import { formatMoney } from '../format'

/** Cadastro e lista de pessoas com seus saldos derivados. */
export default function PeoplePanel({ book, busy, onAdd, onRemove }) {
  const [name, setName] = useState('')
  async function submit(event) {
    event.preventDefault()
    if (await onAdd(name)) setName('')
  }
  return <section className="panel" aria-labelledby="people-title">
    <div className="section-heading"><h2 id="people-title">Pessoas</h2><span className="count">{book.people.length}</span></div>
    <form onSubmit={submit} className="person-form">
      <label htmlFor="person-name">Nome da pessoa</label>
      <div className="input-action"><input id="person-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required disabled={busy} placeholder="Ex.: Ana" autoComplete="off" /><button disabled={busy}>Adicionar</button></div>
    </form>
    {!book.people.length ? <p className="empty">Comece adicionando as pessoas que dividem os gastos.</p> :
      <ul className="people-list">{book.balances.map(person => <li key={person.id}>
        <span className="avatar" aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase('pt-BR')}</span>
        <div className="person-info"><strong>{person.name}</strong><small>Pagou {formatMoney(person.paidCents)} · Sua parte {formatMoney(person.owedCents)}</small></div>
        <div className="person-balance"><strong className={person.balanceCents < 0 ? 'negative' : 'positive'}>{formatMoney(Math.abs(person.balanceCents))}</strong><small>{person.balanceCents > 0 ? 'a receber' : person.balanceCents < 0 ? 'a pagar' : 'em dia'}</small></div>
        <button type="button" className="icon-button" disabled={busy} onClick={() => onRemove(person)} aria-label={`Remover ${person.name}`}>×</button>
      </li>)}</ul>}
  </section>
}
