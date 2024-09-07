import type {Sale} from "~/types/api/item/sale";
import type {SalePaymentMode} from "~/types/api/item/salePaymentMode";
import {formatDateInput} from "~/utils/date";
import dayjs from "dayjs";
import SaleQuery from "~/composables/api/query/SaleQuery";
import SalePaymentModeQuery from "~/composables/api/query/SalePaymentModeQuery";
import type {Member} from "~/types/api/item/member";
import MemberQuery from "~/composables/api/query/MemberQuery";
import {createBrowserCsvDownload} from "~/utils/browser";

export const useSaleStore = defineStore('sale', () => {
  const saleQuery = new SaleQuery()
  const paymentModeQuery = new SalePaymentModeQuery()
  const memberQuery = new MemberQuery()

  const isLoading = ref(false)
  const isDownloadingCsv = ref(false)
  const selectedRange: Ref<{ start: Date, end: Date } | null> = ref({start: new Date(), end: new Date()})
  const lastRefreshDate: Ref<Date> = ref(new Date())

  const shouldRefreshSales = ref(false)

  const sales: Ref<Sale[]> = ref([])
  const salesLoading: Ref<Sale[]> = ref([])

  const seller: Ref<Member | undefined> = ref(undefined)
  const sellers: Ref<Member[]> = ref([])
  const sellersLoading: Ref<Member[]> = ref([])

  const paymentModes: Ref<SalePaymentMode[]> = ref([])

  async function getSales(page: number = 1) {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      page: page.toString(),
    });

    const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
    const formattedEndDate = formatDateInput(dayjs(selectedRange.value.end).add(1, 'days').toString())
    if (formattedStartDate) {
      urlParams.append(`createdAt[after]`, formattedStartDate);

      if (formattedEndDate) {
        urlParams.append(`createdAt[before]`, formattedEndDate);
      } else {
        urlParams.append(`createdAt[before]`, formattedStartDate);
      }
    }

    const { items, view } = await saleQuery.getAll(urlParams)
    salesLoading.value = salesLoading.value.concat(items)

    // We load the next page
    if (view && view["hydra:next"]) {
      await getSales(page + 1)
      return;
    }

    // No more pages to load
    isLoading.value = false
    shouldRefreshSales.value = false

    sales.value = salesLoading.value
    salesLoading.value = []
    lastRefreshDate.value = new Date()

    // We load the payment modes
    await getPaymentModes()

  }

  async function getSalesCsv() {
    isDownloadingCsv.value = true

    const urlParams = new URLSearchParams({
      pagination: 'false',
    });

    if (selectedRange.value) {
      const formattedStartDate = formatDateInput(selectedRange.value.start.toString())
      const formattedEndDate = formatDateInput(dayjs(selectedRange.value.end).add(1, 'days').toString())
      if (formattedStartDate) {
        urlParams.append(`createdAt[after]`, formattedStartDate);

        if (formattedEndDate) {
          urlParams.append(`createdAt[before]`, formattedEndDate);
        } else {
          urlParams.append(`createdAt[before]`, formattedStartDate);
        }
      }
    } else {
      isDownloadingCsv.value = false
      useToast().add({
        color: "red",
        title: "Date non définie.",
        description: "Veuillez sélectionner une date afin de pouvoir télécharger le csv."
      })
      return;
    }

    // We make the search
    const { data } = await saleQuery.getAllCsv(urlParams)
    isDownloadingCsv.value = false
    createBrowserCsvDownload('sales.csv', data)
  }

  async function getPaymentModes() {
    isLoading.value = true
    const { items: paymentModesResponse } = await paymentModeQuery.getAll()
    paymentModes.value = paymentModesResponse
    isLoading.value = false
  }

  async function getSellers(page: number = 1) {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      'order[lastname]': 'ASC',
      'order[firstname]': 'ASC',
      'exists[licence]': 'true', // Exclude super admin
    });
    // URLSearchParams ways so both filter are applied
    urlParams.append('role[]', 'ROLE_ADMIN')
    urlParams.append('role[]', 'ROLE_SUPERVISOR')

    const { items, view } = await memberQuery.getAll(urlParams)
    sellersLoading.value = sellersLoading.value.concat(items)

    // We load the next page
    if (view && view["hydra:next"]) {
      await getSellers(page + 1)
      return;
    }

    // No more pages to load
    isLoading.value = false

    sellers.value = sellersLoading.value
    sellersLoading.value = []
  }

  return {
    sales,
    seller,
    sellers,
    paymentModes,

    isLoading,
    isDownloadingCsv,
    selectedRange,
    lastRefreshDate,
    shouldRefreshSales,

    getSales,
    getSalesCsv,
    getSellers,
    getPaymentModes,
  }
})
