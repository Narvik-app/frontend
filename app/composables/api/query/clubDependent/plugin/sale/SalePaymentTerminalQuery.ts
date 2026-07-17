import type {SalePaymentTerminal, TerminalCheckoutResult, TerminalCheckoutStatusResult, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {usePost, useFetchItem} from "~/composables/api/api";

export default class SalePaymentTerminalQuery extends AbstractClubDependentQuery<SalePaymentTerminal, SalePaymentTerminal> {
  rootPath = "sale-payment-terminals";

  /**
   * Test connection: live status of this device (using its connection's stored credentials).
   */
  async deviceStatus(terminal: SalePaymentTerminal) {
    return useFetchItem<TerminalDevice>(
      (terminal['@id'] ?? '') + '/device-status',
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

  /**
   * Abort the checkout the terminal is currently waiting on (e.g. the cashier
   * cancelled in the UI while the physical terminal was still waiting for a card).
   */
  async cancelCheckout(terminal: SalePaymentTerminal) {
    return usePost<{ cancelled: boolean }>(
      (terminal['@id'] ?? '') + '/cancel-checkout',
      {},
    )
  }
}
