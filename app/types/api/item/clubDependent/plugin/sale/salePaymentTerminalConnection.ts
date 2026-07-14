import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

/** A provider account connection (e.g. one SumUp merchant account): holds shared credentials once. */
export interface SalePaymentTerminalConnection extends UuidItem, ClubLinkedItem {
  name?: string;
  provider?: 'sumup';
  available?: boolean;
  /** Read-only: true if credentials have been configured (credentials themselves are never returned) */
  configured?: boolean;
  /** Write-only: provider-agnostic credentials map, sent on POST/PATCH, never returned */
  credentials?: Record<string, string>;
  /** Read-only: last time "Synchroniser les terminaux" ran (success or failure) */
  lastSyncedAt?: string | null;
}
