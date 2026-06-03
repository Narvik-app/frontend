import type {SalePaymentTerminal, TerminalCheckoutResult, TerminalCheckoutStatusResult, ListDevicesResult, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {usePost, useFetchItem} from "~/composables/api/api";

export default class SalePaymentTerminalQuery extends AbstractClubDependentQuery<SalePaymentTerminal, SalePaymentTerminal> {
  rootPath = "sale-payment-terminals";

  /**
   * Validate credentials and list the devices available for a provider (setup step).
   * A successful response means the credentials are valid.
   */
  async listDevices(provider: string, credentials: Record<string, string>) {
    return usePost<ListDevicesResult>(
      this.getRootUrl() + '/-/list-devices',
      {provider, credentials},
    )
  }

  /**
   * Test connection: live status of the device configured on an existing terminal.
   */
  async deviceStatus(terminal: SalePaymentTerminal) {
    return useFetchItem<TerminalDevice>(
      (terminal['@id'] ?? '') + '/device-status',
    )
  }

  /**
   * List devices for an existing terminal using its stored credentials (reconfiguration).
   */
  async terminalDevices(terminal: SalePaymentTerminal) {
    return useFetchItem<ListDevicesResult>(
      (terminal['@id'] ?? '') + '/devices',
    )
  }

  /**
   * Re-select the active device for an existing terminal (preserves stored credentials).
   */
  async setDevice(terminal: SalePaymentTerminal, deviceId: string) {
    return usePost<{ configured: boolean }>(
      (terminal['@id'] ?? '') + '/device',
      {deviceId},
    )
  }

  /**
   * Initiate a payment on the terminal for the given amount (decimal string, e.g. "15.00").
   * Returns a clientTransactionId to be used with checkoutStatus().
   */
  async checkout(terminal: SalePaymentTerminal, amount: string, description?: string) {
    return usePost<TerminalCheckoutResult>(
      (terminal['@id'] ?? '') + '/checkout',
      {amount, description: description ?? 'Vente'},
    )
  }

  /**
   * Poll the status of a pending checkout.
   */
  async checkoutStatus(terminal: SalePaymentTerminal, clientTransactionId: string) {
    return useFetchItem<TerminalCheckoutStatusResult>(
      (terminal['@id'] ?? '') + '/checkout-status?clientTransactionId=' + encodeURIComponent(clientTransactionId),
    )
  }
}
