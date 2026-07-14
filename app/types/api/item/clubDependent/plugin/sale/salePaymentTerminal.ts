import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import type {SalePaymentTerminalConnection} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminalConnection";

/** A physical device (e.g. a SumUp reader), discovered under a connection via sync-devices. */
export interface SalePaymentTerminal extends UuidItem, ClubLinkedItem {
  name?: string;
  /** Short description shown alongside the name when picking a terminal at checkout */
  description?: string;
  /** Heroicon name (without the "i-heroicons-" prefix), shown on the terminal's checkout card */
  icon?: string;
  available?: boolean;
  /** The provider connection (shared credentials) this device belongs to. IRI string on write, full object on read. */
  connection?: SalePaymentTerminalConnection | string;
  /** Read-only: the provider's own device/reader id, fixed at discovery time */
  externalDeviceId?: string;
  /** Read-only: last time sync-devices still found this device on the provider's side */
  lastSeenAt?: string | null;
  /** Read-only: available && connection is available && connection is configured */
  usable?: boolean;
  /** The payment mode this terminal is offered under. IRI string on write, full object on read. */
  paymentMode?: SalePaymentMode | string | null;
}

export enum SalePaymentTerminalCheckoutStatus {
  Pending = 'pending',
  Successful = 'successful',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface TerminalCheckoutResult {
  clientTransactionId: string;
  providerCheckoutId?: string | null;
}

export interface TerminalCheckoutStatusResult {
  status: SalePaymentTerminalCheckoutStatus;
  transactionId?: string | null;
}

/** A device discovered from a provider, with optional live diagnostics. */
export interface TerminalDevice {
  id: string;
  name: string;
  model?: string | null;
  online: boolean;
  paired: boolean;
  available: boolean;
  /** Live diagnostics (when a status check is available) */
  state?: string | null;
  lastActivity?: string | null;
  batteryLevel?: number | null;
  connectionType?: string | null;
}

export interface ListDevicesResult {
  canList: boolean;
  devices: TerminalDevice[];
}

export interface SyncDevicesResult {
  lastSyncedAt?: string | null;
  devicesFound: number;
  devicesCreated: number;
}

/**
 * Provider-agnostic definition (the front-end "interface" for a terminal provider).
 *
 * To support a new provider, add an entry here describing its credential fields —
 * the connection setup form renders itself from this config, no per-provider UI
 * code needed. Device discovery/naming happens via sync-devices, not here.
 */
export interface TerminalProviderDefinition {
  value: string;
  label: string;
  /** Whether the provider can enumerate physical devices (drives the "Synchroniser" action) */
  supportsDeviceListing: boolean;
  /** Credential fields collected when adding/editing a connection. */
  credentialFields: TerminalCredentialField[];
}

export interface TerminalCredentialField {
  key: string;
  label: string;
  required: boolean;
  secret?: boolean;
  help?: string;
}

export const TERMINAL_PROVIDERS: Record<string, TerminalProviderDefinition> = {
  sumup: {
    value: 'sumup',
    label: 'SumUp',
    supportsDeviceListing: true,
    credentialFields: [
      {key: 'apiKey',       label: 'Clé API',       required: true,  secret: true, help: 'Clé API SumUp (Bearer token)'},
      {key: 'merchantCode', label: 'Code marchand', required: true},
    ],
  },
}

export function getTerminalProvider(value?: string): TerminalProviderDefinition | undefined {
  return value ? TERMINAL_PROVIDERS[value] : undefined
}

export const TERMINAL_PROVIDER_OPTIONS = Object.values(TERMINAL_PROVIDERS).map(p => ({label: p.label, value: p.value}))
