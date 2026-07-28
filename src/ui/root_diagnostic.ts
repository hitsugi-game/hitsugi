import { APP_BUILD_LABEL } from '../core/version'

function shortHash(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function buildDiagnosticId(error: Error): string {
  return `HITSUGI-${APP_BUILD_LABEL}-${shortHash(`${error.name}:${error.message}`)}`
}
