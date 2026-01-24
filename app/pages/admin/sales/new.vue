<script setup lang="ts">
import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";
import SalePaymentModeQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentModeQuery";
import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import {formatMonetary} from "~/utils/string";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import type {SalePurchasedItem} from "~/types/api/item/clubDependent/plugin/sale/salePurchasedItem";
import {useSaleStore} from "~/stores/useSaleStore";
import {useCartStore} from "~/stores/useCartStore";
import {formatDate} from "~/utils/date";
import dayjs from "dayjs";
import {convertUuidToUrlUuid} from "~/utils/resource";
import {print} from "~/utils/browser";
import type {SelectApiItem} from "~/types/select";
import type {Member} from "~/types/api/item/clubDependent/member";

definePageMeta({
    layout: "pos"
  });

  useHead({
    title: 'Nouvelle Vente'
  })

  const isLoading = ref(false)
  const isCreatingSale = ref(false)

  const toast = useToast()

  const saleStore = useSaleStore()
  const cartStore = useCartStore()
  const { searchQuery, cart, cartTotalPrice, cartComment, cartCustomItemModalOpen, customItemForm, selectedPaymentMode } = storeToRefs(cartStore)
  const { sellers, seller, paymentModes } = storeToRefs(saleStore)
  const sellerSelected = ref(!seller.value ? undefined : { label: seller.value.fullName, value: seller.value.uuid, item: seller.value } as SelectApiItem<Member>)

  const sellersSelect = computed( () => {
    const items: SelectApiItem<Member>[] = []
    sellers.value.forEach(value => {
      items.push({
        label: value.fullName,
        value: value.uuid,
        item: value
      })
    })
    return items;
  })

  const inventoryItemQuery = new InventoryItemQuery()
  const paymentModeQuery = new SalePaymentModeQuery()
  const saleQuery = new SaleQuery()

  const searchQueryInput: Ref<string> = ref(searchQuery.value)
  watch(searchQuery, () => {
    searchQueryInput.value = searchQuery.value
    loadItems()
  })

  const inventoryItems: Ref<InventoryItem[]> = ref([])
  const inventoryItemsLoading: Ref<InventoryItem[]> = ref([])
  const orderedItems = computed( () => {
    const categories = new Map<string, InventoryItem[]>()
    inventoryItems.value.forEach(item => {
      if (item.category && item.category.name) {
        if (!categories.has(item.category.name)) {
          categories.set(item.category.name, [])
        }

        // @ts-expect-error - categories.get is guaranteed to exist after the if check
        categories.get(item.category.name).push(item)
      } else {
        if (!categories.has('Non définie')) {
          categories.set('Non définie', [])
        }

        // @ts-expect-error - categories.get is guaranteed to exist after the if check
        categories.get('Non définie').push(item)
      }
    })
    return categories
  })

  async function loadItems(page: number = 1) {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      page: page.toString(),
      canBeSold: 'true',
      'exists[sellingPrice]': 'true'
    });

    if (searchQuery.value.trim().length > 0) {
      urlParams.append('multiple[name, barcode]', searchQuery.value.trim())
    }

    const { items, view } = await inventoryItemQuery.getAll(urlParams)
    inventoryItemsLoading.value = inventoryItemsLoading.value.concat(items)

    // We load the next page
    if (view &&view["next"]) {
      await loadItems(page + 1)
      return;
    }

    // No more pages to load

    inventoryItems.value = inventoryItemsLoading.value
    inventoryItemsLoading.value = []
    isLoading.value = false
  }

  async function _loadPaymentModes() {
    const urlParams = new URLSearchParams({
      available: 'true',
    });
    const { items } = await paymentModeQuery.getAll(urlParams)
    paymentModes.value = items
  }

  let inputTimer: NodeJS.Timeout;
  async function searchQueryUpdated() {
    clearTimeout(inputTimer);
    inputTimer = setTimeout(async () => {
      searchQuery.value = searchQueryInput.value
    }, 250);
  }

  // Camera detection setup

  const cameraPreview = ref(false)
  const cameraIsPresent = verifyCameraIsPresent()

  // Sale management
  function sellerUpdated() {
    if (sellerSelected.value) {
      seller.value = sellerSelected.value.item
    }
  }

  async function createSale() {
    isCreatingSale.value = true

    const salePurchasedItems: SalePurchasedItem[] = []
    cart.value.forEach((item, _key) => {
      const payload: SalePurchasedItem = {
        quantity: item.quantity
      }

      if (item.item['@id']) {
        payload.item = item.item['@id']
      } else {
        payload.itemName = item.item.name
        payload.itemPrice = item.item.sellingPrice
      }

      salePurchasedItems.push(payload)
    })

    const payload: Sale = {
      seller: seller.value?.["@id"],
      comment: cartComment.value.length ? cartComment.value : undefined,
      salePurchasedItems: salePurchasedItems,
      paymentMode: selectedPaymentMode.value?.["@id"]
    }

    const { created, error } = await saleQuery.post(payload)

    isCreatingSale.value = false

    if (!created || error) {
      toast.add({
        color: "error",
        title: "La vente à échoué",
        description: error?.message
      });
      return;
    }

    toast.add({
      color: "success",
      title: "Vente enregistrée",
    });

    cartStore.emptyCart()
    saleStore.shouldRefreshSales = true

    navigateTo('/admin/sales/' + convertUuidToUrlUuid(created.uuid))
  }

  // We load the page content
  loadItems()
  saleStore.getPaymentModes()
  saleStore.getSellers()

  const mobileSideTitle: Ref<string|undefined> = ref(undefined)
  watchEffect(() => {
    mobileSideTitle.value = `Panier (${cartStore.cartTotalItems} `
    if (cartStore.cartTotalItems > 1) {
      mobileSideTitle.value += 'articles'
    } else {
      mobileSideTitle.value += 'article'
    }
    mobileSideTitle.value += ')'
  })
</script>

<template>
  <GenericLayoutContentWithStickySide :mobile-side-title="mobileSideTitle">
    <template #main>
      <UCard class="print:ring-0 print:shadow-none print:!bg-transparent print:text-black">
        <GenericBarcodeReader
          v-model="cameraPreview"
          class="mb-4"
          @decoded="(value) => {searchQuery = value}"
        />

        <div class="flex flex-row items-center mb-4 gap-2 print:hidden">
          <UInput
            v-model="searchQueryInput"
            class="flex-1"
            :loading="isLoading"
            placeholder="Rechercher..."
            @update:model-value="searchQueryUpdated()"
          >
            <template v-if="cameraIsPresent || searchQueryInput" #trailing>
              <UIcon
                v-if="cameraIsPresent"
                class="cursor-pointer"
                name="i-heroicons-qr-code"
                @click="cameraPreview = true"
              />

              <UIcon
                v-if="searchQueryInput"
                class="cursor-pointer"
                name="i-heroicons-x-mark"
                @click="searchQuery = '';"
              />
            </template>
          </UInput>

          <UButton icon="i-heroicons-plus" @click="cartCustomItemModalOpen = true;">
            <span class="hidden sm:block">Article personnalisé</span>
          </UButton>

          <UButton :disabled="isLoading" icon="i-heroicons-printer" @click="print()" />
        </div>
        <UProgress v-if="isLoading" animation="swing" class="mb-2" />

        <div class="hidden print:block text-right font-extralight text-xs mb-4">À date du {{ formatDate(dayjs().toString()) }}</div>

        <div class="print:columns-2 print:gap-2">
          <div v-for="[title, items] in orderedItems" :key="title" class="mb-4 print:mb-1 print:break-inside-avoid-column">
            <div class="print:text-base text-xl font-bold mb-2 border-b">{{ title }}</div>
            <div
              v-for="item in items"
              :key="item.uuid"
              class="flex items-center gap-2 mb-1 hover:bg-neutral-100 dark:hover:bg-neutral-600/50 rounded-md"
            >
              <div class="flex-1 flex flex-col">
                <div class="print:text-xs flex-1">{{ item.name }}</div>
                <div v-if="item.sellingQuantity && item.sellingQuantity != 1" class="text-xs font-bold">Vendu par {{ item.sellingQuantity }}</div>
                <div v-if="item.description" class="text-xs print:hidden">{{ item.description }}</div>
              </div>
              <div
v-if="item.quantityAlert && (item.quantity || item.quantity === 0) && item.quantity <= item.quantityAlert"
                   class="print:hidden text-xs font-bold text-error-600">
                Stock restant : {{ item.quantity }}
              </div>
              <div class="text-xs bg-neutral-200 print:!bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">{{ formatMonetary(item.sellingPrice) }}</div>
              <UButton class="print:hidden" icon="i-heroicons-shopping-cart" size="xs" @click="cartStore.addToCart(item)" />
            </div>
          </div>
        </div>

        <div v-if="!isLoading && orderedItems.size < 1" class="text-center">
          <i>Aucun résultats</i>
        </div>
        <div v-if="isLoading && orderedItems.size < 1" class="text-center">
          <div v-for="j in (Math.floor(Math.random()*6) + 2)" :key="j">
            <USkeleton class="h-4 w-32" />
            <USkeleton class="h-4 w-full my-4" />
          </div>
        </div>
      </UCard>

      <UModal v-model:open="cartCustomItemModalOpen">
        <template #content>
          <div>
            <UCard>
              <UForm class="flex gap-2 flex-col" :state="customItemForm" :validate="cartStore.validateCustomCartForm" @submit="cartStore.addCustomItemToCart">
                <UFormField label="Nom" name="name">
                  <UInput v-model="customItemForm.name"/>
                </UFormField>

                <UFormField label="Prix de vente" name="sellingPrice" description="Le prix peut être négatif afin de faire une réduction.">
                  <UInput v-model="customItemForm.sellingPrice">
                    <template #trailing>
                      <span class="text-gray-500 dark:text-gray-400 text-xs">EUR</span>
                    </template>
                  </UInput>
                </UFormField>

                <div class="flex gap-2 mt-2 justify-end">
                  <UButton color="error" variant="ghost" @click="cartStore.closeCustomItemModal()">
                    Annuler
                  </UButton>

                  <UButton type="submit">
                    Ajouter au panier
                  </UButton>
                </div>
              </UForm>
            </UCard>
          </div>
        </template>
      </UModal>
    </template>

    <template #side>
      <div class="flex flex-col gap-4">
        <UCard class="print:hidden">
          <div class="text-4xl text-center">{{ formatMonetary(cartTotalPrice) }}</div>
          <div class="mt-4">
            <div class="flex text-xs align-center mt-1">
              <div class="flex-1"/>
              <UButton v-if="cart.length > 0" size="xs" @click="cartStore.emptyCart()">Vider le panier</UButton>
            </div>
            <div v-if="cart.length < 1" class="text-center">
              <i>Aucun articles</i>
            </div>
            <div class="overflow-y-auto max-h-[25vh] mt-2">
              <div v-for="cartItem in cart" :key="cartItem.item.uuid" class="flex items-center gap-2 mb-1">
                <GenericStackedUpDown @changed="modifier => { cartStore.addToCart(cartItem.item, modifier) }" />

                <div class="text-xs bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">{{ cartItem.quantity }}</div>
                <div class="text-sm flex-1 leading-tight">{{ cartItem.item.name }}</div>
                <UTooltip :text="'Prix unitaire : ' + formatMonetary(cartItem.item.sellingPrice)" :delay-duration="0">
                  <div class="text-xs bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">
                    <template v-if="cartItem.item.sellingPrice">
                      {{ formatMonetary(Number(Number(cartItem.item.sellingPrice) * cartItem.quantity).toFixed(2)) }}
                    </template>
                    <template v-else>
                      {{ formatMonetary(cartItem.item.sellingPrice) }}
                    </template>
                  </div>
                </UTooltip>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="print:hidden">
          <UFormField label="Vendeur" :error="!sellerSelected && 'Un vendeur doit être défini'">
            <UInputMenu v-model="sellerSelected" class="w-full" :items="sellersSelect" :filter-fields="['item.lastname', 'item.firstname']" @change="sellerUpdated" />
          </UFormField>

          <UFormField class="my-2" label="Commentaire" :error="cartComment.length > 249 && 'Longueur maximum atteinte (250)'">
            <UTextarea v-model="cartComment" :rows="2" autoresize :maxrows="3" placeholder="Commentaire liée à la vente"/>
          </UFormField>

          <UFormField label="Mode de paiement">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="paymentMode in paymentModes"
                :key="paymentMode.uuid"
                :variant="selectedPaymentMode?.uuid == paymentMode.uuid ? 'solid' : 'soft'"
                class="basis-[calc(50%-0.25rem)]">
                <div class="flex items-center w-full" @click="selectedPaymentMode = selectedPaymentMode === paymentMode ? null : paymentMode">
                  <UIcon :name="'i-heroicons-' + paymentMode.icon" />
                  <div class="flex-1">
                    {{ paymentMode.name }}
                  </div>
                </div>
              </UButton>
            </div>
          </UFormField>

          <UButton :loading="isCreatingSale" class="mt-4" block color="success" :disabled="cart.size < 1 || !selectedPaymentMode || !seller" @click="createSale()">Finaliser la vente</UButton>
        </UCard>
      </div>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style scoped lang="css">

</style>
