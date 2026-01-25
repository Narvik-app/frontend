import type {InventoryItem} from "~/types/api/item/clubDependent/plugin/sale/inventoryItem";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import type {FormError} from "#ui/types";
import {defineStore} from "pinia";

interface CartItem {
  item: InventoryItem,
  quantity: number
}

export const useCartStore = defineStore('cart', () => {
  const searchQuery: Ref<string> = ref('')

  const cart: Ref<CartItem[]> = ref([])
  const cartTotalItems = computed( () => {
    let total: number = 0
    cart.value.forEach( item => {
      total += item.quantity ?? 0
    } )
    return total
  })
  const cartTotalPrice = computed( () => {
    let total: number = 0
    cart.value.forEach( item => {
      total += item.quantity * Number(item.item.sellingPrice)
    } )
    return !isNaN(total) ? total.toFixed(2) : '0.00'
  } )
  const cartComment = ref('')

  const cartCustomItemModalOpen = ref(false)
  const customItemForm = reactive<{name: string|undefined, sellingPrice: string|undefined}>({
    name: undefined,
    sellingPrice: undefined
  })

  const selectedPaymentMode: Ref<SalePaymentMode | undefined> = ref(undefined)

  // Cart management
  function addToCart(item: InventoryItem, modifier: number = 1) {
    if (!item.uuid) {
      return
    }

    searchQuery.value = '' // Since the item has been added to the cart, we revert to empty search

    const itemIndex = cart.value.findIndex((cartItem) => cartItem.item.uuid === item.uuid)

    let cartItem: CartItem | undefined = undefined

    if (itemIndex < 0) {
      cartItem = { quantity: modifier, item: item }
    } else {
      cartItem = cart.value[itemIndex]
      cartItem.quantity += modifier
    }

    if (cartItem.quantity <= 0) {
      cart.value = cart.value.filter(cartItem => cartItem.item.uuid !== item.uuid)
    } else {
      // New item
      if (itemIndex < 0) {
        cart.value.push(cartItem)
      } else {
        cart.value[itemIndex] = cartItem
      }
    }
  }

  function emptyCart() {
    cart.value = []
    searchQuery.value = ''
    selectedPaymentMode.value = undefined
    cartComment.value = ''
  }


  // Custom cart item
  function validateCustomCartForm(state: { name?: string; sellingPrice?: string }): FormError[] {
    const errors = []
    if (!state.name) errors.push({ name: 'name', message: 'Champ requis' })
    if (!state.sellingPrice) errors.push({ name: 'sellingPrice', message: 'Champ requis' })
    const sellingPrice = parseFloat(state.sellingPrice ?? '')
    if (isNaN(sellingPrice)) errors.push({ name: 'sellingPrice', message: 'Le champ doit être un nombre' })
    return errors
  }

  function addCustomItemToCart() {
    if (!customItemForm.sellingPrice) {
      closeCustomItemModal()
      return
    }

    // Negative ID, Backend know it's not a real item
    const item: InventoryItem = {
      uuid: Number(- Math.floor(Math.random() * 200000)).toString(),
      name: customItemForm.name,
      sellingPrice: parseFloat(customItemForm.sellingPrice.replace(',', '.')).toFixed(2),
    }
    addToCart(item)
    closeCustomItemModal()
  }

  function closeCustomItemModal() {
    customItemForm.name = undefined
    customItemForm.sellingPrice = undefined
    cartCustomItemModalOpen.value = false
  }

	return {
    searchQuery,

    cart,
    cartTotalItems,
    cartTotalPrice,
    cartComment,

    cartCustomItemModalOpen,
    customItemForm,

    selectedPaymentMode,

    addToCart,
    emptyCart,

    validateCustomCartForm,
    addCustomItemToCart,
    closeCustomItemModal,
	}
}, {
  persist: {
    // We only save those attributes
    pick: [
      'cart',
      'cartTotalItems',
      'cartTotalPrice',
      'cartComment',
      'selectedPaymentMode',
    ],
  }
})
