import {WebAuthnError} from "@simplewebauthn/browser";

/**
 * Another ceremony replaced this one (or the page was left): nothing to report.
 */
export function isPasskeyAborted(e: unknown): boolean {
  return e instanceof WebAuthnError && e.code === 'ERROR_CEREMONY_ABORTED'
}

/**
 * The browser refused the ceremony. Browsers use the same error when the user closes the prompt,
 * when it times out, or when the device has no matching passkey: they can't be told apart.
 */
export function isPasskeyNotAllowed(e: unknown): boolean {
  return (e as Error)?.name === 'NotAllowedError'
}
