import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {InventoryItem} from '~/types/api/item/clubDependent/plugin/sale/inventoryItem'

export const LOAN_ITEM_STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  loaned: 'Prêté',
  maintenance: 'Maintenance',
  sold: 'Vendu',
  retired: 'Retiré',
}

export const LOAN_ITEM_STATUS_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'neutral' | 'error'> = {
  available: 'success',
  loaned: 'primary',
  maintenance: 'warning',
  sold: 'neutral',
  retired: 'error',
}

export function effectiveLoanItemStatus(item?: LoanItem): string {
  if (item?.isCurrentlyLoaned) return 'loaned'
  return item?.status ?? 'available'
}

export function groupLoanItemsByCategory(items: LoanItem[], fallbackLabel = 'Sans catégorie'): Map<string, LoanItem[]> {
  const map = new Map<string, LoanItem[]>()
  for (const item of items) {
    const key = typeof item.category === 'object' ? item.category?.name ?? fallbackLabel : fallbackLabel
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }
  return map
}

/** Category string used for loan fees in sale stats — keeps them grouped and out of the inventory categories. */
export function loanSaleCategory(item: LoanItem): string {
  const category = typeof item.category === 'object' ? item.category?.name : undefined
  return category ? `Prêt — ${category}` : 'Prêt'
}

/** Build a cart-compatible pseudo InventoryItem for a loan fee (no @id → sent as a free-form sale line). */
export function buildLoanCartItem(item: LoanItem, price: string): InventoryItem {
  return {
    uuid: `loan-${item.uuid}`, // deterministic → re-lending the same item bumps quantity instead of duplicating
    name: item.name,
    sellingPrice: price,
    category: {name: loanSaleCategory(item)},
  }
}
