<script setup lang="ts">
import LoanItemQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanItemQuery'
import LoanCategoryQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanCategoryQuery'
import LoanQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanQuery'
import FileQuery from '~/composables/api/query/FileQuery'
import type {LoanItem, LoanItemStatus} from '~/types/api/item/clubDependent/plugin/loan/loanItem'
import type {LoanCategory} from '~/types/api/item/clubDependent/plugin/loan/loanCategory'
import {convertUuidToUrlUuid} from '~/utils/resource'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import {print} from '~/utils/browser'
import {formatDate} from '~/utils/date'
import LoanModalRecord from '~/components/Loan/LoanModalRecord.vue'

definePageMeta({layout: 'loan'})
useHead({title: 'Prêts'})

const toast = useToast()
const overlay = useOverlay()
const selfStore = useSelfUserStore()
const canEdit = computed(() => selfStore.can(Permission.LoanItemsEdit))
const canLoan = computed(() => selfStore.can(Permission.LoanEdit))

const itemQuery = new LoanItemQuery()
const categoryQuery = new LoanCategoryQuery()
const loanQuery = new LoanQuery()
const fileQuery = new FileQuery()
const returningItemUuid = ref<string | undefined>()

const allItems = ref<LoanItem[]>([])
const categories = ref<LoanCategory[]>([])
const isLoading = ref(true)
const searchQuery = ref('')

const itemModalOpen = ref(false)
const selectedItem = ref<LoanItem | undefined>()
// Image cache: uuid -> base64
const imageCache = ref<Record<string, string>>({})

const today = new Date().toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'})

async function loadAll() {
  isLoading.value = true
  const [catResult] = await Promise.all([
    categoryQuery.getAll(),
  ])
  categories.value = catResult.items

  const loaded: LoanItem[] = []
  const urlParams = new URLSearchParams({itemsPerPage: '100'})
  let page = 1
  while (true) {
    urlParams.set('page', page.toString())
    const {items, view} = await itemQuery.getAll(urlParams)
    loaded.push(...items)
    if (!view?.['next']) break
    page++
  }
  allItems.value = loaded
  isLoading.value = false
  // Pre-load images
  loadImages(loaded)
}

async function loadImages(items: LoanItem[]) {
  for (const item of items) {
    if (item.uuid && item.image?.privateUrl && !imageCache.value[item.uuid]) {
      const {retrieved} = await fileQuery.getFromUrl(item.image.privateUrl)
      if (retrieved?.base64) {
        imageCache.value[item.uuid] = retrieved.base64
      }
    }
  }
}

async function openLoanModal(item: LoanItem) {
  if (item.isCurrentlyLoaned) {
    toast.add({color: 'warning', title: 'Article déjà en prêt', description: 'Enregistrez le retour avant de créer un nouveau prêt.'})
    return
  }
  const instance = overlay.create(LoanModalRecord).open({loanItem: item})
  if (await instance.result) {
    const {retrieved} = await itemQuery.get(item.uuid!)
    if (retrieved) onItemUpdated(retrieved)
  }
}

async function returnItemLoan(item: LoanItem) {
  if (!item.uuid) return
  returningItemUuid.value = item.uuid
  const p = new URLSearchParams({'loanItem.uuid': item.uuid, 'exists[endDate]': 'false'})
  const {items: openLoans, error: fetchError} = await loanQuery.getAll(p)
  if (fetchError || !openLoans[0]) {
    toast.add({color: 'error', title: 'Impossible de trouver le prêt en cours', description: fetchError?.message})
    returningItemUuid.value = undefined
    return
  }
  const {error} = await loanQuery.patch(openLoans[0], {endDate: new Date().toISOString()})
  returningItemUuid.value = undefined
  if (error) {
    toast.add({color: 'error', title: 'Erreur lors du retour', description: error.message})
    return
  }
  toast.add({color: 'success', title: 'Retour enregistré'})
  const {retrieved} = await itemQuery.get(item.uuid)
  if (retrieved) onItemUpdated(retrieved)
}

function onItemUpdated(item: LoanItem) {
  itemModalOpen.value = false
  const idx = allItems.value.findIndex(i => i.uuid === item.uuid)
  if (idx !== -1) allItems.value.splice(idx, 1, item)
  else allItems.value.push(item)
  if (item.uuid && item.image?.privateUrl) {
    fileQuery.getFromUrl(item.image.privateUrl).then(({retrieved}) => {
      if (retrieved?.base64 && item.uuid) imageCache.value[item.uuid] = retrieved.base64
    })
  }
}

loadAll()

const searchLower = computed(() => searchQuery.value.toLowerCase().trim())

function matchesSearch(item: LoanItem): boolean {
  if (!searchLower.value) return true
  return (
    item.name?.toLowerCase().includes(searchLower.value) ||
    item.description?.toLowerCase().includes(searchLower.value) ||
    false
  )
}

const filteredItems = computed(() =>
  allItems.value.filter(matchesSearch)
)

function groupByCategory(items: LoanItem[]): Map<string, LoanItem[]> {
  const map = new Map<string, LoanItem[]>()
  for (const item of items) {
    const key = item.category ? (typeof item.category === 'string' ? item.category : item.category.name ?? 'Sans catégorie') : 'Sans catégorie'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

const grouped = computed(() => groupByCategory(filteredItems.value))

function effectiveStatus(item: LoanItem): string {
  if (item.isCurrentlyLoaned) return 'loaned'
  return item.status ?? 'available'
}

const statusColors: Record<string, string> = {
  available: 'success',
  loaned: 'primary',
  maintenance: 'warning',
  sold: 'neutral',
  retired: 'error',
}

const statusLabels: Record<string, string> = {
  available: 'Disponible',
  loaned: 'Prêté',
  maintenance: 'Maintenance',
  sold: 'Vendu',
  retired: 'Retiré',
}
</script>

<template>
  <div>
    <!-- Top bar — hidden on print -->
    <div class="flex items-center gap-2 mb-4 flex-wrap print:hidden">
      <UInput
        v-model="searchQuery"
        placeholder="Rechercher…"
        class="w-64"
      >
        <template v-if="searchQuery" #trailing>
          <UIcon class="cursor-pointer" name="i-heroicons-x-mark" @click="searchQuery = ''" />
        </template>
      </UInput>

      <div class="flex-1" />

      <UButton icon="i-heroicons-printer" variant="ghost" color="neutral" @click="print()">
        Imprimer
      </UButton>

      <UButton
        v-if="canEdit"
        icon="i-heroicons-plus"
        @click="selectedItem = undefined; itemModalOpen = true"
      />
    </div>

    <!-- Print-only date header -->
    <div class="hidden print:block mb-4">
      <h1 class="text-xl font-bold print:text-black">Liste des articles en prêt</h1>
      <p class="text-sm print:text-black">Imprimé le {{ today }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12 print:hidden">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-muted" />
    </div>

    <template v-else>
      <div v-if="grouped.size === 0" class="text-center py-8 text-muted italic text-sm print:hidden">
        Aucun article.
      </div>

      <!-- Items grouped by category -->
      <div v-for="[catName, items] in grouped" :key="catName" class="mb-6 print:break-inside-avoid">
        <h2 class="text-base font-semibold mb-2 border-b pb-1 print:text-black print:border-black">
          {{ catName }}
        </h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 print:grid-cols-2 print:gap-1">
          <NuxtLink
            v-for="item in items"
            :key="item.uuid"
            :to="selfStore.can(Permission.LoanItemsAccess) ? '/admin/loans/items/' + convertUuidToUrlUuid(item.uuid) : undefined"
            class="block"
          >
            <UCard
              class="print:border print:border-black print:rounded-none print:break-inside-avoid hover:bg-muted/50 transition-colors"
              :ui="{body: 'flex flex-col gap-2'}"
            >
              <!-- Image — full width, capped height -->
              <img
                v-if="item.uuid && imageCache[item.uuid]"
                :src="imageCache[item.uuid]"
                :alt="item.name"
                class="w-full h-44 object-cover rounded-md print:hidden"
              />

              <!-- Name / description / price -->
              <div>
                <p class="font-medium text-sm truncate print:text-black">{{ item.name }}</p>
                <p v-if="item.description" class="text-xs text-muted truncate print:text-black print:text-xs">
                  {{ item.description }}
                </p>
                <p v-if="item.loanPrice" class="text-xs text-muted print:text-black">
                  {{ item.loanPrice }} €/prêt
                </p>
              </div>

              <!-- Loan/return action (left) + status (right) -->
              <div class="flex items-center justify-between gap-2 print:hidden">
                <UButton
                  v-if="canLoan && !item.isCurrentlyLoaned"
                  size="xs"
                  variant="soft"
                  color="primary"
                  icon="i-heroicons-archive-box-arrow-down"
                  label="Prêter"
                  @click.prevent.stop="openLoanModal(item)"
                />
                <UButton
                  v-else-if="canLoan"
                  size="xs"
                  variant="soft"
                  color="success"
                  icon="i-heroicons-arrow-uturn-left"
                  label="Retourner"
                  :loading="returningItemUuid === item.uuid"
                  @click.prevent.stop="returnItemLoan(item)"
                />
                <div v-else />

                <UBadge
                  :color="(statusColors[effectiveStatus(item)] as 'success'|'primary'|'warning'|'neutral'|'error')"
                  variant="soft"
                >
                  {{ statusLabels[effectiveStatus(item)] }}
                </UBadge>
              </div>
              <span class="hidden print:inline text-xs font-medium print:text-black">
                {{ statusLabels[effectiveStatus(item)] }}
              </span>
            </UCard>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>

  <!-- Create/edit item modal -->
  <UModal v-model:open="itemModalOpen">
    <template #content>
      <UCard>
        <LoanItemForm
          :item="selectedItem ? {...selectedItem} : undefined"
          :categories="categories"
          @updated="onItemUpdated"
        />
      </UCard>
    </template>
  </UModal>
</template>
