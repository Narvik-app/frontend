import type {FormErrorEvent} from '#ui/types'

/** UForm @error handler: focuses and scrolls the first invalid field into view. */
export function useFormScrollToFirstError() {
  return function onError(event: FormErrorEvent) {
    const firstError = event.errors[0]
    if (!firstError?.id) return
    const element = document.getElementById(firstError.id)
    element?.focus()
    element?.scrollIntoView({behavior: 'smooth', block: 'center'})
  }
}
