export const MAX_PEOPLE = 100
export const MAX_EXPENSES = 10000
export const MAX_AMOUNT_CENTS = 100000000

/** Erro de domínio com mensagem segura para apresentação ao usuário. */
export class ValidationError extends Error {}

/** Valida um objeto JSON e rejeita propriedades inesperadas. */
export function validateFields(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    throw new ValidationError('Dados inválidos. Confira os campos enviados.')
  }
}

/** Normaliza Unicode e valida tamanho e caracteres de controle. */
export function validateText(value, label, maximum) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) throw new ValidationError(`${label} inválido.`)
  const text = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  if (!text || text.length > maximum) throw new ValidationError(`${label} deve ter de 1 a ${maximum} caracteres.`)
  return text
}

/** Converte decimal com vírgula ou ponto em centavos inteiros, sem arredondamento. */
export function parseMoney(value) {
  if (typeof value !== 'string' || !/^\d{1,7}(?:[.,]\d{1,2})?$/u.test(value.trim())) throw new ValidationError('Informe um valor como 25,90, sem separador de milhares.')
  const [whole, fraction = ''] = value.trim().split(/[.,]/u)
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) throw new ValidationError('O valor deve ser positivo e não superar R$ 1.000.000,00.')
  return cents
}

/** Retorna a data civil local em YYYY-MM-DD. */
export function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Rejeita datas inexistentes, futuras ou anteriores a 1900. */
export function validateDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new ValidationError('Informe uma data válida.')
  const date = new Date(`${value}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > today()) throw new ValidationError('A data deve existir e estar entre 1900 e hoje.')
  return value
}

/** Divide centavos exatamente; o resto segue a ordem de cadastro. */
export function splitEqually(amountCents, participantIds) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_AMOUNT_CENTS || !Array.isArray(participantIds) || !participantIds.length || participantIds.length > MAX_PEOPLE || participantIds.some(id => typeof id !== 'string' || !id) || new Set(participantIds).size !== participantIds.length) throw new ValidationError('Valor ou participantes inválidos para a divisão.')
  const share = Math.floor(amountCents / participantIds.length)
  const remainder = amountCents % participantIds.length
  return participantIds.map((personId, index) => ({ personId, amountCents: share + (index < remainder ? 1 : 0) }))
}

/** Valida a despesa e deriva suas cotas de participantes existentes. */
export function validateExpense(input, people) {
  validateFields(input, ['description', 'amountCents', 'payerId', 'participantIds', 'date'])
  const description = validateText(input.description, 'Descrição', 200)
  const date = validateDate(input.date)
  const peopleIds = new Set(people.map(person => person.id))
  if (!peopleIds.has(input.payerId)) throw new ValidationError('Selecione quem pagou.')
  if (!Array.isArray(input.participantIds) || !input.participantIds.length || input.participantIds.some(id => !peopleIds.has(id)) || new Set(input.participantIds).size !== input.participantIds.length) throw new ValidationError('Selecione participantes cadastrados, sem repetições.')
  const selected = new Set(input.participantIds)
  const participantIds = people.filter(person => selected.has(person.id)).map(person => person.id)
  const shares = splitEqually(input.amountCents, participantIds)
  return { description, amountCents: input.amountCents, payerId: input.payerId, participantIds, shares, date }
}

/** Saldos: positivo recebe, negativo paga. Custo O(pessoas + cotas). */
export function calculateBalances(people, expenses) {
  const balances = new Map(people.map(person => [person.id, { ...person, paidCents: 0, owedCents: 0, balanceCents: 0 }]))
  for (const expense of expenses) {
    balances.get(expense.payerId).paidCents += expense.amountCents
    for (const share of expense.shares) balances.get(share.personId).owedCents += share.amountCents
  }
  return [...balances.values()].map(person => ({ ...person, balanceCents: person.paidCents - person.owedCents }))
}

/** Sugere acertos em O(P log P); não promete o mínimo matemático global. */
export function simplifyDebts(balances) {
  const creditors = balances.filter(person => person.balanceCents > 0).map(person => ({ id: person.id, remaining: person.balanceCents }))
  const debtors = balances.filter(person => person.balanceCents < 0).map(person => ({ id: person.id, remaining: -person.balanceCents }))
  creditors.sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id))
  debtors.sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id))
  const transfers = []
  let creditorIndex = 0
  let debtorIndex = 0
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]
    const amountCents = Math.min(creditor.remaining, debtor.remaining)
    transfers.push({ fromId: debtor.id, toId: creditor.id, amountCents })
    creditor.remaining -= amountCents
    debtor.remaining -= amountCents
    if (!creditor.remaining) creditorIndex++
    if (!debtor.remaining) debtorIndex++
  }
  return transfers
}
