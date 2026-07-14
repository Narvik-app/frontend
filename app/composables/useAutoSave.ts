import type {NuxtError} from "#app";

/**
 * Generic debounced auto-save: call `save(item, payload)` on every field
 * change (e.g. `@update:model-value`), it debounces and PATCHes automatically.
 * Modeled on the pattern proven in `InventoryStockControl.vue` (debounce +
 * isSaving flag), generalized to any query exposing `.patch(item, payload)`.
 *
 * Payloads passed to `save()` within the same debounce window are merged, so
 * editing two fields in quick succession doesn't clobber one of them.
 */
interface AutoSaveQuery<T> {
  patch(item: T, payload: T): Promise<{ updated?: T; error?: NuxtError }>
}

export function useAutoSave<T extends object>(
  query: AutoSaveQuery<T>,
  options?: {
    debounceMs?: number
    onSaved?: (updated: T) => void
    onError?: (error: NuxtError) => void
  },
) {
  const debounceMs = options?.debounceMs ?? 500
  const isSaving = ref(false)

  let timer: ReturnType<typeof setTimeout> | undefined
  let pendingItem: T | undefined
  let pendingPayload: Partial<T> = {}

  async function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    if (!pendingItem || Object.keys(pendingPayload).length === 0) return

    const item = pendingItem
    const payload = pendingPayload as T
    pendingItem = undefined
    pendingPayload = {}

    isSaving.value = true
    const {updated, error} = await query.patch(item, payload)
    isSaving.value = false

    if (error) options?.onError?.(error)
    else if (updated) options?.onSaved?.(updated)
  }

  /** Schedule a debounced save; call repeatedly, e.g. on every keystroke. */
  function save(item: T, payload: Partial<T>) {
    pendingItem = item
    pendingPayload = {...pendingPayload, ...payload}

    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void flush() }, debounceMs)
  }

  return {save, flush, isSaving}
}
