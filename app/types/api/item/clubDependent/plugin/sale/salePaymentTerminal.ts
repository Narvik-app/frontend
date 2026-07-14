import type {UuidItem} from "~/types/api/uuidItem";
import type {ClubLinkedItem} from "~/types/api/clubLinkedItem";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";

export interface SalePaymentTerminal extends UuidItem, ClubLinkedItem {
  name?: string;
  /** Short description shown alongside the name when picking a terminal at checkout */
  description?: string;
  /** Heroicon name (without the "i-heroicons-" prefix), shown on the terminal's checkout card */
  icon?: string;
  provider?: 'sumup';
  available?: boolean;
  /** Read-only: true if credentials have been configured (credentials themselves are never returned) */
  configured?: boolean;
  /** Write-only: provider-agnostic credentials map, sent on POST/PATCH, never returned */
  credentials?: Record<string, string>;
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

/** A single step inside a provider's setup flow. */
export interface TerminalStep {
  id: string;    // unique step value, e.g. 'credentials', 'device'
  title: string; // label shown in the stepper
  icon: string;  // heroicon name
}

/**
 * Provider-agnostic definition (the front-end "interface" for a terminal provider).
 *
 * To support a new provider, add an entry here describing its credential fields,
 * setup steps, and capabilities — the setup modal renders itself from this config,
 * no per-provider UI code needed.
 */
export interface TerminalProviderDefinition {
  value: string;
  label: string;
  /** Whether the provider can enumerate physical devices (drives the device-selection step) */
  supportsDeviceListing: boolean;
  /**
   * Ordered list of provider-specific setup steps (shown after the "Provider" step).
   * Each step's `id` maps to a block of form content in ModalTerminalSetup.
   */
  steps: TerminalStep[];
  /**
   * Credentials collected during the 'credentials' step (everything except the device).
   * For providers that list devices, the chosen device id is merged in under `deviceCredentialKey`.
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
    steps: [
      {id: 'credentials', title: 'Identifiants', icon: 'i-heroicons-key'},
      {id: 'device',      title: 'Terminal',     icon: 'i-heroicons-device-phone-mobile'},
    ],
    credentialFields: [
      {key: 'apiKey',       label: 'Clé API',       required: true,  secret: true, help: 'Clé API SumUp (Bearer token)'},
      {key: 'merchantCode', label: 'Code marchand', required: true},
      {key: 'affiliateKey', label: 'Clé affilié',   required: false, secret: true},
    ],
  },
}

export function getTerminalProvider(value?: string): TerminalProviderDefinition | undefined {
  return value ? TERMINAL_PROVIDERS[value] : undefined
}

export const TERMINAL_PROVIDER_OPTIONS = Object.values(TERMINAL_PROVIDERS).map(p => ({label: p.label, value: p.value}))
