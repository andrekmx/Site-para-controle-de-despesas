/** Erro HTTP com mensagem segura retornada pela API. */
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

/** Envia uma operação à API da mesma origem, com limite de espera de 10 segundos. */
export async function requestBook(path = '/api/livro', { method = 'GET', body, revision } = {}) {
  let response
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000),
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(revision !== undefined ? { 'If-Match': `"${revision}"` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique se ele está rodando e atualize o livro antes de tentar novamente.', 0)
  }
  let data
  try { data = await response.json() } catch { throw new ApiError('O servidor retornou uma resposta inválida.', response.status) }
  if (!response.ok) throw new ApiError(data.error || 'Não foi possível concluir a operação.', response.status)
  return data
}
