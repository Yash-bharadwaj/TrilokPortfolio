/** Raw Firebase codes are never shown to a hotel manager. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect username or password.',
  'auth/invalid-email': 'Incorrect username or password.',
  'auth/user-not-found': 'Incorrect username or password.',
  'auth/wrong-password': 'Incorrect username or password.',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed': 'No internet connection. Please check your network.',
  'auth/user-disabled': 'This account has been disabled. Please contact the owner.',
  'permission-denied': 'You do not have permission to do that.',
  unavailable: 'No internet connection. Your changes will sync once you are back online.',
  'failed-precondition': 'Could not complete that right now. Please try again.',
  'deadline-exceeded': 'The network is slow. Please try again.',
  unauthenticated: 'Your session expired. Please sign in again.',
}

export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    if (MESSAGES[code]) return MESSAGES[code]
    const short = code.replace(/^[a-z]+\//, '')
    if (MESSAGES[short]) return MESSAGES[short]
  }
  if (error instanceof Error && /network|fetch|offline/i.test(error.message)) {
    return 'No internet connection. Please check your network.'
  }
  return fallback
}
