export type StorageFailureReason = 'unavailable' | 'security' | 'quota' | 'unknown'

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: StorageFailureReason }

function failureReason(error: unknown): StorageFailureReason {
  if (error instanceof DOMException) {
    if (error.name === 'SecurityError') return 'security'
    if (error.name === 'QuotaExceededError' || error.code === 22) return 'quota'
  }
  return 'unknown'
}

function storage(): StorageResult<Storage> {
  try {
    const value = globalThis.localStorage
    return value ? { ok: true, value } : { ok: false, reason: 'unavailable' }
  } catch (error) {
    return { ok: false, reason: failureReason(error) }
  }
}

export function safeStorageGet(key: string): StorageResult<string | null> {
  const target = storage()
  if (!target.ok) return target
  try {
    return { ok: true, value: target.value.getItem(key) }
  } catch (error) {
    return { ok: false, reason: failureReason(error) }
  }
}

export function safeStorageSet(key: string, value: string): StorageResult<void> {
  const target = storage()
  if (!target.ok) return target
  try {
    target.value.setItem(key, value)
    return { ok: true, value: undefined }
  } catch (error) {
    return { ok: false, reason: failureReason(error) }
  }
}

export function safeStorageRemove(key: string): StorageResult<void> {
  const target = storage()
  if (!target.ok) return target
  try {
    target.value.removeItem(key)
    return { ok: true, value: undefined }
  } catch (error) {
    return { ok: false, reason: failureReason(error) }
  }
}
