import {WebAuthnError} from "@simplewebauthn/browser";

/**
 * The user closed the browser passkey prompt, or another ceremony replaced this one: nothing to report.
 */
export function isPasskeyCancelled(e: unknown): boolean {
  return (e as Error)?.name === 'NotAllowedError' || (e instanceof WebAuthnError && e.code === 'ERROR_CEREMONY_ABORTED')
}
