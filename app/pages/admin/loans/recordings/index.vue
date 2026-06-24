<script setup lang="ts">
import LoanRecordingQuery from '~/composables/api/query/clubDependent/plugin/loan/LoanRecordingQuery'
import type {LoanRecording} from '~/types/api/item/clubDependent/plugin/loan/loanRecording'
import {convertUuidToUrlUuid} from '~/utils/resource'
import {useSelfUserStore} from '~/stores/useSelfUser'
import {Permission} from '~/types/api/permissions'
import type {TablePaginateInterface} from '~/types/table'
import {formatDate} from '~/utils/date'

definePageMeta({layout: 'loan'})
useHead({title: 'Enregistrements'})

const selfStore = useSelfUserStore()
const canAccess = computed(() => selfStore.can(Permission.LoanRecordingsAccess))

const query = new LoanRecordingQuery()
const recordings = ref<LoanRecording[]>([])
const total = ref(0)
const isLoading = ref(true)
const page = ref(1)
const perPage = ref(30)

const columns = [
  {accessorKey: 'date', header: 'Date'},
  {accessorKey: 'loanItem', header: 'Article'},
  {accessorKey: 'recordingType', header: 'Type'},
  {accessorKey: 'author', header: 'Auteur'},
  {accessorKey: 'description', header: 'Description'},
  {accessorKey: 'actions', header: ''},
]

load()

async function load() {
  isLoading.value = true
  const p = new URLSearchParams({
    page: page.value.toString(),
    itemsPerPage: perPage.value.toString(),
    'order[date]': 'desc',
  })
  const {items, totalItems} = await query.getAll(p)
  recordings.value = items
  total.value = totalItems ?? 0
  isLoading.value = false
}

function getItemName(r: LoanRecording): {name: string; uuid?: string} {
  if (!r.loanItem) return {name: '-'}
  if (typeof r.loanItem === 'object') return {name: r.loanItem.name ?? '-', uuid: r.loanItem.uuid}
  return {name: '-'}
}

function getMemberName(m: unknown): string {
  if (!m || typeof m !== 'object') return '-'
  const member = m as {fullName?: string; firstname?: string; lastname?: string}
  return (member.fullName ?? `${member.firstname ?? ''} ${member.lastname ?? ''}`.trim()) || '-'
}
</script>

<template>
  <UCard>
    <UTable
      class="w-full"
      :loading="isLoading"
      :columns="columns"
      :data="recordings"
    >
      <template #empty>
        <div class="py-6 text-center italic text-sm">Aucun enregistrement.</div>
      </template>

      <template #date-cell="{ row }">{{ formatDate(row.original.date) }}</template>

      <template #loanItem-cell="{ row }">
        <NuxtLink
          v-if="getItemName(row.original).uuid"
          :to="'/admin/loans/items/' + convertUuidToUrlUuid(getItemName(row.original).uuid)"
          class="hover:underline"
        >
          {{ getItemName(row.original).name }}
        </NuxtLink>
        <span v-else>{{ getItemName(row.original).name }}</span>
      </template>

      <template #recordingType-cell="{ row }">
        <template v-if="row.original.recordingType && typeof row.original.recordingType === 'object'">
          <span
            v-if="row.original.recordingType.color"
            class="inline-block w-2 h-2 rounded-full mr-1"
            :style="{backgroundColor: row.original.recordingType.color}"
          />
          {{ row.original.recordingType.name }}
        </template>
        <span v-else class="text-muted">-</span>
      </template>

      <template #author-cell="{ row }">{{ getMemberName(row.original.author) }}</template>

      <template #description-cell="{ row }">
        <span class="text-xs">{{ row.original.description }}</span>
      </template>

      <template #actions-cell="{ row }">
        <UButton
          v-if="getItemName(row.original).uuid"
          size="xs"
          variant="ghost"
          icon="i-heroicons-archive-box"
          :to="'/admin/loans/items/' + convertUuidToUrlUuid(getItemName(row.original).uuid)"
        />
      </template>
    </UTable>

    <GenericTablePagination
      v-model:page="page"
      v-model:items-per-page="perPage"
      :total-items="total"
      @paginate="(_: TablePaginateInterface) => load()"
    />
  </UCard>
</template>
