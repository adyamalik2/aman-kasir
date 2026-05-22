function createFallbackId(): string {
  const timePart = Date.now().toString(36)
  const randomPart = Math.random().toString(36).slice(2, 10)

  return `${timePart}${randomPart}`
}

function createRandomId(): string {
  const cryptoApi = globalThis.crypto

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return createFallbackId()
}

function normalizePrefix(prefix: string): string {
  return prefix.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Generate ID unik lokal, dengan prefix opsional seperti `prod_xxxxx`.
 */
export function generateId(prefix?: string): string {
  const id = createRandomId()
  const normalizedPrefix = prefix ? normalizePrefix(prefix) : ''

  return normalizedPrefix ? `${normalizedPrefix}_${id}` : id
}
