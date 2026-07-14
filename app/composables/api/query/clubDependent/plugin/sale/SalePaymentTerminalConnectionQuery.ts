import type {SalePaymentTerminalConnection} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminalConnection";
import type {ListDevicesResult, SyncDevicesResult} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";
import {usePost} from "~/composables/api/api";

export default class SalePaymentTerminalConnectionQuery extends AbstractClubDependentQuery<SalePaymentTerminalConnection, SalePaymentTerminalConnection> {
  rootPath = "sale-payment-terminal-connections";

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
   * Discover/refresh all devices for this connection: creates new SalePaymentTerminal
   * rows for newly-found devices, and stamps lastSeenAt on every device still found.
   */
  async syncDevices(connection: SalePaymentTerminalConnection) {
    return usePost<SyncDevicesResult>(
      (connection['@id'] ?? '') + '/sync-devices',
      {},
    )
  }
}
