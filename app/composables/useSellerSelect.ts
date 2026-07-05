import {storeToRefs} from 'pinia'
import {useSaleStore} from '~/stores/useSaleStore'
import {useSelfUserStore} from '~/stores/useSelfUser'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {SelectApiItem} from '~/types/select'

/**
 * Shared "seller/loaner" selection (the admin or supervisor currently operating the counter).
 * Backed by useSaleStore so the choice is persisted (localStorage) and shared across Sale and Loan flows.
 */
export function useSellerSelect() {
  const saleStore = useSaleStore()
  const selfStore = useSelfUserStore()
  const {sellers, seller} = storeToRefs(saleStore)

  function toSelectItem(member: Member): SelectApiItem<Member> {
    return {
      label: member.fullName ?? `${member.firstname ?? ''} ${member.lastname ?? ''}`.trim(),
      value: member.uuid,
      item: member,
    }
  }

  const sellerSelected = ref<SelectApiItem<Member> | undefined>(seller.value ? toSelectItem(seller.value) : undefined)

  watch(sellerSelected, (value) => {
    seller.value = value?.item
  })

  const sellersSelect = computed(() => sellers.value.map(toSelectItem))

  async function ensureLoaded() {
    if (sellers.value.length === 0) {
      await saleStore.getSellers()
    }
    if (sellerSelected.value) return

    if (seller.value) {
      sellerSelected.value = toSelectItem(seller.value)
      return
    }

    // Default to the current user if they're in the sellers list
    const currentMember = selfStore.member
    const match = currentMember ? sellers.value.find(m => m.uuid === currentMember.uuid) : undefined
    if (match) sellerSelected.value = toSelectItem(match)
  }

  return {sellerSelected, sellersSelect, ensureLoaded}
}
