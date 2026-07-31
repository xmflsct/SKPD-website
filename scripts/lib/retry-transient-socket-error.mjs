const RETRYABLE_CODES = new Set(['EPIPE', 'ECONNRESET', 'UND_ERR_SOCKET'])

export async function retryTransientSocketError(operation) {
  try {
    return await operation()
  } catch (error) {
    if (!RETRYABLE_CODES.has(error?.cause?.code)) throw error
    return operation()
  }
}
