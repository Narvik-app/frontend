<script setup lang="ts">
import type {Ref} from "vue";
import type {SalePurchasedItem} from "~/types/api/item/clubDependent/plugin/sale/salePurchasedItem";
import {formatMonetary} from "~/utils/string";

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  }
})

interface CategoryMapping {
  name: string,
  items: Map<string, ItemMapping>
}

interface ItemMapping {
  item: SalePurchasedItem,
  counts: Map<string, PaymentModeCountMapping>
}

interface PaymentModeCountMapping {
  count: number,
  amount: number
}

const saleStore = useSaleStore()
const { paymentModes, sales } = storeToRefs(saleStore)

const categories: Ref<Map<string, CategoryMapping>> = ref(new Map())
const mapping: Ref<CategoryMapping[]> = ref([])

watchEffect(() => {
  generateList()
})

function getDefaultPaymentMapping(): Map<string, PaymentModeCountMapping> {
  const map = new Map<string, PaymentModeCountMapping>
  paymentModes.value.forEach((pm) => {
    if (!pm.name) return
    map.set(pm.name, {
      amount: 0,
      count: 0
    })
  })

  return map
}

function generateList() {
  categories.value = new Map()

  sales.value.forEach((sale) => {
    if (
      !sale.salePurchasedItems
      || !sale.paymentMode
      || typeof sale.paymentMode == 'string'
    ) {
      return
    }

    const salePaymentMode = sale.paymentMode.name
    if (!salePaymentMode) return

    // We loop through each purchases
    sale.salePurchasedItems.forEach((salePurchasedItem) => {
      if (
        !salePurchasedItem.itemName
        || !salePurchasedItem.itemPrice
      ) {
        return
      }

      const purchasedCategory = salePurchasedItem.itemCategory ?? '000'
      let categoryMapping = categories.value.get(purchasedCategory)
      if (!categoryMapping) {
        categoryMapping = {
          name: purchasedCategory,
          items: new Map<string, ItemMapping>()
        }
      }

      let salePurchasedItemMap = categoryMapping.items.get(salePurchasedItem.itemName)
      if (!salePurchasedItemMap) {
        salePurchasedItemMap = {
          item: salePurchasedItem,
          counts: getDefaultPaymentMapping()
        }
      }

      // We update the item count
      const mappedPaymentMode = salePurchasedItemMap.counts.get(salePaymentMode)
      if (!mappedPaymentMode) return

      mappedPaymentMode.count += salePurchasedItem.quantity ?? 0
      mappedPaymentMode.amount += Number(salePurchasedItem.itemPrice) * Number(salePurchasedItem.quantity ?? 0)
      salePurchasedItemMap.counts.set(salePaymentMode, mappedPaymentMode)

      categoryMapping.items.set(salePurchasedItem.itemName, salePurchasedItemMap)

      // We update the category mapping
      categories.value.set(purchasedCategory, categoryMapping)
    })
  })

  mapping.value = Array.from(categories.value.values()).sort((a, b) => {
    const aName = a.name
    const bName = b.name
    return aName.toLowerCase() > bName.toLowerCase() ? 1 : -1
  })
}
</script>

<template>
  <template v-if="props.isLoading">
    <UCard v-for="i in Math.floor(Math.random() * 3) + 1" :key="`loading-${i}`">
      <USkeleton class="h-8 w-36 mb-4" />
      <div class="gap-2 grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <USkeleton v-for="j in Math.floor(Math.random() * 5) + 2" :key="`skeleton-${i}-${j}`" class="h-24 w-full" />
      </div>
    </UCard>
  </template>
  <template v-else>
    <UCard v-for="(categoryMap, cIndex) in mapping" :key="cIndex">
    <div>
      <div class="text-xl font-bold mb-4">{{ categoryMap.name == '000' ? 'Sans catégorie' : categoryMap.name }}</div>
      <div class="gap-2 grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <UCard v-for="(itemMap, iIndex) in Array.from(categoryMap.items.values()).sort((a, b) => { return (a.item.itemName?.toLowerCase() ?? '') > (b.item.itemName?.toLowerCase() ?? '') ? 1 : -1 })" :key="iIndex">
          <div class="flex flex-col gap-2">
            <div class="text-lg font-bold text-center">{{ itemMap.item.itemName }}</div>

            <div class="flex flex-col">
              <div
                  v-for="[name, pmMap] in itemMap.counts"
                  :key="name"
                  :class="'grid grid-flow-row grid-cols-3 ' + (pmMap.count < 1 ? 'opacity-20' : '')"
              >
                <div>
                  {{ name }}
                </div>
                <div class="text-center">
                  {{ pmMap.count }}
                </div>
                <div>
                  {{ formatMonetary(pmMap.amount) }}
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </UCard>
  </template>
</template>

<style scoped lang="css">

</style>
