import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import {useFetchList, useUploadFile} from "~/composables/api/api";
import type {InventoryItemHistory} from "~/types/api/item/clubDependent/plugin/sale/inventoryItemHistory";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class InventoryItemQuery extends AbstractClubDependentQuery<InventoryItem, InventoryItem> {
  rootPath = "inventory-items";

  async histories(id: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${id}/histories`;

    if (!urlParams) {
      urlParams = new URLSearchParams()
    }

    url += '?' + urlParams.toString()

    return useFetchList<InventoryItemHistory>(url)
  }

  async dailyHistories(id: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${id}/histories-per-day`;
    if (!urlParams) urlParams = new URLSearchParams();
    url += '?' + urlParams.toString();
    return useFetchList<InventoryItemHistory>(url);
  }

  async importFromCsv(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/from-csv", formData)
  }
}
