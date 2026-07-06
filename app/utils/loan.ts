import type {LoanItem} from '~/types/api/item/clubDependent/plugin/loan/loanItem'

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
