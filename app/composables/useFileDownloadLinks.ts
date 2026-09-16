import type {File} from '~/types/api/item/file'
import {getFilePdfObjectUrl} from '~/utils/timeAndTravel'

/**
 * Resolves a set of File PDFs into real blob: object URLs, keyed by an arbitrary id (e.g. the
 * owning resource's uuid). A download link needs an actual href up front for the browser's native
 * middle-click/ctrl-click/"open in new tab" behavior to work — a click handler firing an async
 * fetch can't support that. Object URLs are revoked when the component using this unmounts.
 */
export function useFileDownloadLinks() {
  const hrefs = ref<Record<string, string>>({})
  const errors = ref<Record<string, string>>({})

  async function resolve(key: string, file: File | null | undefined) {
    if (hrefs.value[key] || errors.value[key]) return

    const {url, error} = await getFilePdfObjectUrl(file)
    if (url) {
      hrefs.value[key] = url
    } else {
      errors.value[key] = error?.message ?? 'Fichier introuvable'
    }
  }

  onUnmounted(() => {
    Object.values(hrefs.value).forEach(url => URL.revokeObjectURL(url))
  })

  return {hrefs, errors, resolve}
}
