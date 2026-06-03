import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";

export interface SalePaymentTerminal extends UuidItem, ClubLinkedItem {
  name?: string;
  provider?: 'sumup';
  available?: boolean;
  /** Read-only: true if credentials have been configured (credentials themselves are never returned) */
  configured?: boolean;
  /** Write-only: provider-agnostic credentials map, sent on POST/PATCH, never returned */
  credentials?: Record<string, string>;
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

/** A device discovered from a provider during setup, with optional live diagnostics. */
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

/**
 * Provider-agnostic definition (the front-end "interface" for a terminal provider).
 *
 * To support a new provider, add an entry here describing its setup credential fields
 * and capabilities — the setup modal renders itself from this, no per-provider UI code.
 */
export interface TerminalProviderDefinition {
  value: string;
  label: string;
  /** Whether the provider can enumerate physical devices (drives the device-selection step) */
  supportsDeviceListing: boolean;
  /**
   * Credentials collected in step 1 (everything except the device).
   * For providers that list devices, the chosen device id is stored under `deviceCredentialKey`.
   */
  credentialFields: TerminalCredentialField[];
  /** Credential key that receives the selected device id (e.g. 'readerId' for SumUp) */
  deviceCredentialKey?: string;
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
    deviceCredentialKey: 'readerId',
    credentialFields: [
      {key: 'apiKey', label: 'Clé API', required: true, secret: true, help: 'Clé API SumUp (Bearer token)'},
      {key: 'merchantCode', label: 'Code marchand', required: true},
      {key: 'affiliateKey', label: 'Clé affilié', required: false, secret: true},
    ],
  },
}

export function getTerminalProvider(value?: string): TerminalProviderDefinition | undefined {
  return value ? TERMINAL_PROVIDERS[value] : undefined
}

export const TERMINAL_PROVIDER_OPTIONS = Object.values(TERMINAL_PROVIDERS).map(p => ({label: p.label, value: p.value}))
