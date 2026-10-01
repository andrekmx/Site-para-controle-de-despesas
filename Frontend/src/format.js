const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
/** Formata centavos em reais apenas na apresentação. */
export function formatMoney(cents) { return currency.format(cents / 100) }
/** Formata data civil sem mudar o dia por fuso horário. */
export function formatDate(date) { return date.split('-').reverse().join('/') }
