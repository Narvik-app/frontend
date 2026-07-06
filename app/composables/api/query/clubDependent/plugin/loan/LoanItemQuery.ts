import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import {useFetchList, useUploadFile} from '~/composables/api/api'
import {AbstractSortableQuery} from '~/composables/api/query/AbstractSortableQuery'

export interface LoanItemUsagePerDay {
  day: string
  count: number
}

export default class LoanItemQuery extends AbstractSortableQuery<LoanItem, LoanItem> {
  rootPath = 'loan-items'

  async usagePerDay(itemUuid: string, urlParams?: URLSearchParams) {
    let url = `${this.getRootUrl()}/${itemUuid}/usage-per-day`
    if (!urlParams) urlParams = new URLSearchParams()
    url += '?' + urlParams.toString()
    return useFetchList<LoanItemUsagePerDay>(url)
  }

  async updateImage(item: LoanItem, formData: FormData | null) {
    return useUploadFile(`${this.getRootUrl()}/${item.uuid}/image`, formData ?? new FormData())
  }
}
