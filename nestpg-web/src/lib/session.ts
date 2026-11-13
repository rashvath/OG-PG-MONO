export const TOKEN_STORAGE_KEY = 'nestpg-token'
export const USER_STORAGE_KEY = 'nestpg-user'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY)
}

export function isTokenValid(token: string | null): boolean {
  if (!token) {
    return false
  }

  try {
    const segments = token.split('.')
    if (segments.length !== 3) {
      return false
    }

    const encodedPayload = segments[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '='))) as {
      exp?: unknown
    }

    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(TOKEN_STORAGE_KEY)
  sessionStorage.removeItem(USER_STORAGE_KEY)
}
