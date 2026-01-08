import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import {useUploadFile} from "~/composables/api/api";
import {AbstractClubDependentQuery} from "~/composables/api/query/AbstractClubDependentQuery";

export default class SaleQuery extends AbstractClubDependentQuery<Sale, Sale> {
  rootPath = "sales";

  async importFromCsv(formData: FormData) {
    return useUploadFile(this.getRootUrl() + "/-/from-csv", formData)
  }
}
