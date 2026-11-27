import type {TimestampItem} from "~/types/api/timestampItem";
import type {UuidItem} from "~/types/api/uuidItem";

/** A passkey registered by the logged user (GET /self/passkeys) */
export interface WebauthnCredential extends TimestampItem, UuidItem {
  name?: string;
  lastUsedAt?: string | null;
}

/** Returned by the options endpoints: the challenge to send back, and the options for the browser */
export interface WebauthnOptions<T> {
  challengeId: string;
  publicKey: T;
}
