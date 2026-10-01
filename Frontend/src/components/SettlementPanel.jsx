import { formatMoney } from '../format'

/** Apresenta os acertos sugeridos sem registrar transferências financeiras reais. */
export default function SettlementPanel({ book }) {
  const names = new Map(book.people.map(person => [person.id, person.name]))
  return <section className="panel" aria-labelledby="settlement-title">
    <div className="section-heading"><h2 id="settlement-title">Quem deve a quem</h2><span className="eyebrow">ACERTOS</span></div>
    {!book.expenses.length ? <p className="empty">Os acertos aparecem aqui depois do primeiro lançamento.</p> : !book.transfers.length ? <div className="settled"><span aria-hidden="true">✓</span><h3>Tudo em dia</h3><p>Os saldos do grupo estão equilibrados.</p></div> :
      <ol className="transfers">{book.transfers.map(transfer => <li key={`${transfer.fromId}-${transfer.toId}`}><div><strong>{names.get(transfer.fromId)}</strong><span> paga para </span><strong>{names.get(transfer.toId)}</strong></div><strong className="transfer-value">{formatMoney(transfer.amountCents)}</strong></li>)}</ol>}
    <p className="panel-note">Sugestões calculadas a partir dos saldos. Pagamentos feitos fora do aplicativo ainda não são registrados nesta versão.</p>
  </section>
}
