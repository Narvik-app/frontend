<script setup lang="ts">
import InventoryItemQuery from "~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery";
import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import {formatMonetary} from "~/utils/string";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import type {SalePurchasedItem} from "~/types/api/item/clubDependent/plugin/sale/salePurchasedItem";
import type {SalePaymentTerminal} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {SalePaymentTerminalCheckoutStatus} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {useSaleStore} from "~/stores/useSaleStore";
import {useCartStore} from "~/stores/useCartStore";
import {formatDate} from "~/utils/date";
import dayjs from "dayjs";
import {convertUuidToUrlUuid} from "~/utils/resource";
import {print} from "~/utils/browser";
import type {SelectApiItem} from "~/types/select";
import type {Member} from "~/types/api/item/clubDependent/member";
import LoanItemQuery from "~/composables/api/query/clubDependent/plugin/loan/LoanItemQuery";
import LoanQuery from "~/composables/api/query/clubDependent/plugin/loan/LoanQuery";
import type {LoanItem} from "~/types/api/item/clubDependent/plugin/loan/loanItem";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import LoanModalRecord from "~/components/Loan/LoanModalRecord.vue";
import {groupLoanItemsByCategory} from "~/utils/loan";
import ModalTerminalPayment from "~/components/Sale/ModalTerminalPayment.vue";
import ModalTerminalSelect from "~/components/Sale/ModalTerminalSelect.vue";


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
  const saleQuery = new SaleQuery()
  const terminalQuery = new SalePaymentTerminalQuery()
  const loanItemQuery = new LoanItemQuery()
  const loanQuery = new LoanQuery()
  const overlay = useOverlay()
  const overlaySelectTerminal = overlay.create(ModalTerminalSelect)

  // Terminal payment modal state (driven by the polling loop below)
  const showTpeModal = ref(false)
  const tpePhase = ref<'waiting' | 'success' | 'failed' | 'cancelled' | 'error'>('waiting')
  const tpeError = ref<string | undefined>(undefined)
  const tpeAmount = ref('')
  const tpeTerminalName = ref<string | undefined>(undefined)

  // Promise resolver used to bridge modal button clicks into the async polling loop
  let resolveTerminalAction: ((v: { type: 'success'; transactionId: string } | { type: 'manual' } | { type: 'cancel' }) => void) | null = null

  function onTerminalManual() {
    showTpeModal.value = false
    resolveTerminalAction?.({type: 'manual'})
  }

  function onTerminalCancel() {
    showTpeModal.value = false
    resolveTerminalAction?.({type: 'cancel'})
  }
  
  // Loan items visible on sale page
  const selfStore = useSelfUserStore()
  const canLoan = computed(() => selfStore.can(Permission.LoanEdit))
  const loanItems = ref<LoanItem[]>([])
  const returningLoanItemUuid = ref<string | undefined>()
  if (selfStore.selectedProfile?.club.loansEnabled) {
    const p = new URLSearchParams({visibleOnSalePage: '1', status: 'available', pagination: 'false'})
    loanItemQuery.getAll(p).then(r => { loanItems.value = r.items })
  }

  function onLoanItemUpdated(item: LoanItem) {
    const idx = loanItems.value.findIndex(i => i.uuid === item.uuid)
    if (idx !== -1) loanItems.value.splice(idx, 1, item)
  }

  const orderedLoanItems = computed(() => groupLoanItemsByCategory(loanItems.value, 'Non définie'))

  async function openLoanItemModal(item: LoanItem) {
    if (item.isCurrentlyLoaned) {
      toast.add({color: 'warning', title: 'Article déjà en prêt', description: 'Enregistrez le retour avant de créer un nouveau prêt.'})
      return
    }
    const instance = overlay.create(LoanModalRecord).open({loanItem: item})
    if (await instance.result) {
      const {retrieved} = await loanItemQuery.get(item.uuid!)
      if (retrieved) onLoanItemUpdated(retrieved)
    }
  }

  async function returnLoanItem(item: LoanItem) {
    if (!item.uuid) return
    returningLoanItemUuid.value = item.uuid
    const p = new URLSearchParams({'loanItem.uuid': item.uuid, 'exists[endDate]': 'false'})
    const {items: openLoans, error: fetchError} = await loanQuery.getAll(p)
    if (fetchError || !openLoans[0]) {
      toast.add({color: 'error', title: 'Impossible de trouver le prêt en cours', description: fetchError?.message})
      returningLoanItemUuid.value = undefined
      return
    }
    const {error} = await loanQuery.patch(openLoans[0], {endDate: new Date().toISOString()})
    returningLoanItemUuid.value = undefined
    if (error) {
      toast.add({color: 'error', title: 'Erreur lors du retour', description: error.message})
      return
    }
    toast.add({color: 'success', title: 'Retour enregistré'})
    const {retrieved} = await loanItemQuery.get(item.uuid)
    if (retrieved) onLoanItemUpdated(retrieved)
  }

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

  /** Build the list of purchased items from the cart */
  function buildPurchasedItems(): SalePurchasedItem[] {
    return cart.value.map(item => {
      const payload: SalePurchasedItem = {quantity: item.quantity}
      if (item.item['@id']) {
        payload.item = item.item['@id']
      } else {
        payload.itemName = item.item.name
        payload.itemPrice = item.item.sellingPrice
      }
      return payload
    })
  }

  /** Post the sale to the API and navigate on success */
  async function submitSale(extraComment?: string) {
    const comment = [cartComment.value, extraComment].filter(Boolean).join(' ').trim()
    const payload: Sale = {
      seller: seller.value?.["@id"],
      comment: comment.length ? comment : undefined,
      salePurchasedItems: buildPurchasedItems(),
      paymentMode: selectedPaymentMode.value?.["@id"],
    }

    const {created, error} = await saleQuery.post(payload)

    if (!created || error) {
      toast.add({
        color: "error",
        title: "La vente a échoué",
        description: error?.message,
      })
      return
    }

    toast.add({color: "success", title: "Vente enregistrée"})
    cartStore.emptyCart()
    saleStore.shouldRefreshSales = true
    navigateTo('/admin/sales/' + convertUuidToUrlUuid(created.uuid))
  }

  /**
   * Run the terminal payment flow: open the modal, then start polling.
   * Resolves when the terminal confirms, or when the user clicks manual/cancel.
   * The modal (ModalTerminalPayment) is driven by reactive refs.
   */
  function runTerminalPayment(terminal: SalePaymentTerminal): Promise<{ type: 'success'; transactionId: string } | { type: 'manual' } | { type: 'cancel' }> {
    tpePhase.value = 'waiting'
    tpeError.value = undefined
    tpeAmount.value = String(cartTotalPrice.value)
    tpeTerminalName.value = terminal.name
    showTpeModal.value = true

    const result = new Promise<{ type: 'success'; transactionId: string } | { type: 'manual' } | { type: 'cancel' }>((resolve) => {
      resolveTerminalAction = resolve
    })

    // Drive the checkout + polling asynchronously; it resolves via resolveTerminalAction
    void pollTerminalPayment(terminal)

    return result
  }

  async function pollTerminalPayment(terminal: SalePaymentTerminal) {
    // Initiate checkout on the terminal
    const {item: checkoutResult, error: checkoutError} = await terminalQuery.checkout(terminal, tpeAmount.value)

    // Guard: user may have already cancelled while the checkout was in-flight
    if (!showTpeModal.value) return

    if (checkoutError || !checkoutResult?.clientTransactionId) {
      // Terminal unreachable / offline — keep modal open with manual + cancel buttons
      tpePhase.value = 'error'
      tpeError.value = checkoutError?.message ?? 'Impossible de contacter le terminal.'
      return
    }

    // Poll until success / failure / cancellation / timeout
    const clientTransactionId = checkoutResult.clientTransactionId
    const deadline = Date.now() + 120_000

    while (showTpeModal.value && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 2000))

      if (!showTpeModal.value) return // User clicked cancel/manual during the wait

      const {retrieved} = await terminalQuery.checkoutStatus(terminal, clientTransactionId)

      if (!retrieved || !showTpeModal.value) continue

      if (retrieved.status === SalePaymentTerminalCheckoutStatus.Successful) {
        tpePhase.value = 'success'
        await new Promise(r => setTimeout(r, 900)) // brief success animation
        showTpeModal.value = false
        resolveTerminalAction?.({type: 'success', transactionId: retrieved.transactionId ?? clientTransactionId})
        return
      } else if (retrieved.status === SalePaymentTerminalCheckoutStatus.Failed) {
        tpePhase.value = 'failed'
        return // Wait for manual/cancel
      } else if (retrieved.status === SalePaymentTerminalCheckoutStatus.Cancelled) {
        tpePhase.value = 'cancelled'
        return // Wait for manual/cancel
      }
      // Pending → loop
    }

    if (showTpeModal.value) {
      // Reached deadline without result
      tpePhase.value = 'error'
      tpeError.value = "Délai d'attente dépassé. Le terminal n'a pas confirmé le paiement."
      // Wait for manual/cancel
    }
  }

  /**
   * Open the card-grid selection modal (linked terminals + "Manuel").
   * Resolves with the cashier's choice, or undefined if cancelled.
   */
  async function selectTerminal(terminals: SalePaymentTerminal[]): Promise<{ type: 'terminal'; terminal: SalePaymentTerminal } | { type: 'manual' } | undefined> {
    let choice: { type: 'terminal'; terminal: SalePaymentTerminal } | { type: 'manual' } | undefined

    const instance = overlaySelectTerminal.open({
      terminals,
      onSelect(result) {
        choice = result
        overlaySelectTerminal.close(true)
      },
    })
    await instance.result

    return choice
  }

  async function createSale() {
    isCreatingSale.value = true

    const terminals = (selectedPaymentMode.value?.paymentTerminals ?? []).filter(t => t.usable)

    if (terminals.length === 0) {
      // Standard flow: no terminal linked to this payment mode
      await submitSale()
      isCreatingSale.value = false
      return
    }

    // Let the cashier pick which terminal to send the payment to (or manual)
    const choice = await selectTerminal(terminals)
    if (!choice) {
      // Cancelled the selection modal
      isCreatingSale.value = false
      return
    }

    if (choice.type === 'manual') {
      await submitSale('(paiement manuel)')
      isCreatingSale.value = false
      return
    }

    // Terminal payment flow
    const result = await runTerminalPayment(choice.terminal)

    if (result.type === 'cancel') {
      isCreatingSale.value = false
      return
    }

    const extraComment = result.type === 'success'
      ? `sumup: ${result.transactionId}`
      : '(paiement manuel)'

    await submitSale(extraComment)
    isCreatingSale.value = false
  }

  // We load the page content
  loadItems()
  saleStore.getPaymentModes()
  saleStore.getSellers()

  const isStockRemovalMode = computed(() => selectedPaymentMode.value?.kind === 'stock_removal')

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
              data-testid="inventory-item-row"
            >
              <div class="flex-1 flex flex-col">
                <div class="print:text-xs flex-1">{{ item.name }}</div>
                <div v-if="item.sellingQuantity && item.sellingQuantity != 1" class="text-xs font-bold">Vendu par {{ item.sellingQuantity }}</div>
                <div v-if="item.description" class="text-xs print:hidden">{{ item.description }}</div>
              </div>
              <div
                v-if="(item.quantity || item.quantity === 0)"
                :class="item.quantityAlert && item.quantity <= item.quantityAlert ? 'print:hidden text-xs font-bold text-error-600' : 'print:hidden text-xs opacity-50 hover:opacity-100'">
                Stock : {{ item.quantity }}
              </div>
              <div data-testid="item-price" class="text-xs bg-neutral-200 print:!bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">{{ formatMonetary(item.sellingPrice) }}</div>
              <UButton class="print:hidden" data-testid="add-to-cart" icon="i-heroicons-shopping-cart" size="xs" @click="cartStore.addToCart(item)" />
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

      <!-- Loan items section — quick lend/return -->
      <UCard v-if="selfStore.selectedProfile?.club.loansEnabled && loanItems.length > 0" class="mt-4 print:hidden">
        <div class="font-bold text-lg mb-3 flex items-center gap-2">
          <UIcon name="i-heroicons-archive-box" />
          Matériel en prêt
        </div>
        <div v-for="[title, items] in orderedLoanItems" :key="title" class="mb-4 last:mb-0">
          <div class="text-sm font-semibold mb-2 border-b">{{ title }}</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="item in items"
              :key="item.uuid"
              class="flex items-center gap-2 border rounded-lg p-2"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ item.name }}</p>
                <p v-if="item.loanPrice" class="text-xs text-muted">{{ item.loanPrice }} €/prêt</p>
              </div>
              <UBadge
                v-if="item.isCurrentlyLoaned"
                variant="soft"
                size="xs"
              >
                Prêté
              </UBadge>

              <UButton
                v-if="canLoan && !item.isCurrentlyLoaned"
                size="xs"
                color="primary"
                icon="i-heroicons-archive-box-arrow-down"
                @click="openLoanItemModal(item)"
              >
                Prêter
              </UButton>
              <UButton
                v-else-if="canLoan"
                size="xs"
                color="success"
                icon="i-heroicons-arrow-uturn-left"
                :loading="returningLoanItemUuid === item.uuid"
                @click="returnLoanItem(item)"
              >
                Retourner
              </UButton>
            </div>
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
          <div data-testid="cart-total-price" class="text-4xl text-center">{{ formatMonetary(isStockRemovalMode ? '0' : cartTotalPrice) }}</div>
          <div class="mt-4">
            <div class="flex text-xs align-center mt-1">
              <div class="flex-1"/>
              <UButton v-if="cart.length > 0" size="xs" @click="cartStore.emptyCart()">Vider le panier</UButton>
            </div>
            <div v-if="cart.length < 1" class="text-center">
              <i data-testid="cart-empty">Aucun articles</i>
            </div>
            <div class="overflow-y-auto max-h-[25vh] mt-2">
              <div v-for="cartItem in cart" :key="cartItem.item.uuid" class="flex items-center gap-2 mb-1">
                <GenericStackedUpDown @changed="modifier => { cartStore.addToCart(cartItem.item, modifier) }" />

                <div class="text-xs bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">{{ cartItem.quantity }}</div>
                <div class="text-sm flex-1 leading-tight">{{ cartItem.item.name }}</div>
                <UTooltip :text="'Prix unitaire : ' + formatMonetary(cartItem.item.sellingPrice)" :delay-duration="0">
                  <div data-testid="cart-item-total-price" class="text-xs bg-neutral-200 dark:bg-neutral-600 p-1 rounded-md">
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
            <div data-testid="seller-input-wrapper" class="w-full">
              <UInputMenu
                v-model="sellerSelected"
                class="w-full"
                :items="sellersSelect"
                :filter-fields="['item.lastname', 'item.firstname']"
                @change="sellerUpdated"
              />
            </div>
          </UFormField>

          <UFormField class="my-2" label="Commentaire" :error="cartComment.length > 249 && 'Longueur maximum atteinte (250)'">
            <UTextarea v-model="cartComment" :rows="2" autoresize :maxrows="3" placeholder="Commentaire liée à la vente"/>
          </UFormField>

          <UFormField label="Mode de paiement">
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="paymentMode in paymentModes"
                :key="paymentMode.uuid"
                :data-testid="'payment-mode-' + paymentMode.name.toLowerCase()"
                :variant="selectedPaymentMode?.uuid == paymentMode.uuid ? 'solid' : 'soft'"
                class="basis-[calc(50%-0.25rem)]"
                @click="selectedPaymentMode = selectedPaymentMode === paymentMode ? null : paymentMode">
                <div class="flex items-center w-full">
                  <UIcon :name="'i-heroicons-' + paymentMode.icon" />
                  <div class="flex-1">
                    {{ paymentMode.name }}
                  </div>
                </div>
              </UButton>
            </div>
          </UFormField>

          <UButton
            data-testid="finalize-sale"
            :loading="isCreatingSale"
            class="mt-4"
            block
            :color="isStockRemovalMode ? 'warning' : 'success'"
            :disabled="cart.length < 1 || !selectedPaymentMode || !sellerSelected"
            @click="createSale()"
          >
            {{ isStockRemovalMode ? 'Enregistrer la sortie de stock' : 'Finaliser la vente' }}
          </UButton>
        </UCard>
      </div>
    </template>
  </GenericLayoutContentWithStickySide>

  <!-- Terminal payment waiting modal — driven by the polling loop in createSale() -->
  <ModalTerminalPayment
    :open="showTpeModal"
    :amount-display="tpeAmount + ' €'"
    :terminal-name="tpeTerminalName"
    :phase="tpePhase"
    :error-message="tpeError"
    @manual="onTerminalManual"
    @cancel="onTerminalCancel"
  />
</template>

<style scoped lang="css">

</style>
