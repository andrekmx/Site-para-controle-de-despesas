import { useEffect, useRef, useState } from 'react'
import { parseMoney, splitEqually, today, validateExpense } from '../../../shared/ledger.mjs'
import { formatMoney } from '../format'

/** Formulário controlado de despesa; a API repete todas as validações. */
export default function ExpenseForm({ people, expense, busy, onSave, onCancel }) {
  const [description, setDescription] = useState(expense?.description || '')
  const [amount, setAmount] = useState(expense ? (expense.amountCents / 100).toFixed(2).replace('.', ',') : '')
  const [payerId, setPayerId] = useState(expense?.payerId || '')
  const [date, setDate] = useState(expense?.date || today())
  const [participantIds, setParticipantIds] = useState(expense?.participantIds || [])
  const [error, setError] = useState('')
  const descriptionInput = useRef(null)
  useEffect(() => { if (expense) descriptionInput.current?.focus() }, [expense])
  const activeIds = people.filter(person => participantIds.includes(person.id)).map(person => person.id)
  let preview = []
  try { if (activeIds.length && amount) preview = splitEqually(parseMoney(amount), activeIds) } catch { /* A mensagem de validação aparece no envio. */ }

  function toggle(id) {
    setParticipantIds(current => current.includes(id) ? current.filter(personId => personId !== id) : [...current, id])
  }
  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const data = validateExpense({ description, amountCents: parseMoney(amount), payerId, date, participantIds: activeIds }, people)
      const { shares: _shares, ...payload } = data
      if (await onSave(payload, expense?.id)) {
        setDescription(''); setAmount(''); setPayerId(''); setDate(today()); setParticipantIds([])
      }
    } catch (validationError) { setError(validationError.message) }
  }

  return <section className="panel expense-panel" aria-labelledby="expense-title">
    <div className="section-heading"><h2 id="expense-title">{expense ? 'Editar despesa' : 'Registrar despesa'}</h2><span className="eyebrow">DIVISÃO IGUALITÁRIA</span></div>
    {!people.length ? <p className="empty">Adicione uma pessoa para registrar a primeira despesa.</p> : <form onSubmit={submit}>
      <fieldset disabled={busy} className="expense-fields">
        <div className="description-field"><label htmlFor="description">Descrição</label><input ref={descriptionInput} id="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={200} required placeholder="Ex.: Mercado da semana" /></div>
        <div><label htmlFor="amount">Valor total (R$)</label><input id="amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} maxLength={10} required placeholder="0,00" aria-describedby="amount-help" /><small id="amount-help">Ex.: 150,90, sem milhares.</small></div>
        <div><label htmlFor="date">Data</label><input id="date" type="date" value={date} onChange={event => setDate(event.target.value)} min="1900-01-01" max={today()} required /></div>
        <div><label htmlFor="payer">Quem pagou?</label><select id="payer" value={payerId} onChange={event => setPayerId(event.target.value)} required><option value="">Selecione uma pessoa</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></div>
      </fieldset>
      <fieldset disabled={busy} className="participants"><legend>Dividir entre</legend><button type="button" className="text-button" onClick={() => setParticipantIds(people.map(person => person.id))}>Selecionar todas</button><div className="participant-options">{people.map(person => <label key={person.id} className={activeIds.includes(person.id) ? 'participant selected' : 'participant'}><input type="checkbox" checked={activeIds.includes(person.id)} onChange={() => toggle(person.id)} />{person.name}</label>)}</div></fieldset>
      {!!preview.length && <div className="split-preview"><span>Cota por pessoa</span><ul>{preview.map(share => <li key={share.personId}>{people.find(person => person.id === share.personId).name}: <strong>{formatMoney(share.amountCents)}</strong></li>)}</ul><small>Centavos restantes vão para as primeiras pessoas cadastradas entre as selecionadas. Quem pagou pode participar da divisão ou pagar para outras pessoas.</small></div>}
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions"><button disabled={busy}>{busy ? 'Salvando…' : expense ? 'Salvar alterações' : 'Registrar despesa'}</button>{expense && <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar edição</button>}</div>
    </form>}
  </section>
}
