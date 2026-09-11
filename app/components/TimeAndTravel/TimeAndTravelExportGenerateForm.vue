<script setup lang="ts">
import TimeAndTravelExportQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelExportQuery'
import type {TimeAndTravelExport} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import type {FormError, FormErrorEvent} from '#ui/types'
import {formatDateInput, formatDateRangeReadable} from '~/utils/date'
import type {DateRange} from '~/types/date'

const emit = defineEmits(['updated', 'canceled'])

const toast = useToast()
const exportQuery = new TimeAndTravelExportQuery()

const selectedRange = ref<DateRange | undefined>(undefined)
const dateRangePopoverOpen = ref(false)
const isCreating = ref(false)

const state = computed(() => ({selectedRange: selectedRange.value}))

const validate = (): FormError[] => {
  const errors: FormError[] = []
  if (!selectedRange.value) errors.push({name: 'selectedRange', message: 'Champ requis'})
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

async function onSubmit() {
  if (!selectedRange.value) return
  isCreating.value = true

  const payload = {
    startDate: formatDateInput(selectedRange.value.start.toString()),
    endDate: formatDateInput(selectedRange.value.end.toString()),
  }

  const {created, error} = await exportQuery.post(payload)
  isCreating.value = false

  if (error) {
    toast.add({title: 'Une erreur est survenue', description: error.message, color: 'error'})
    return
  }

  toast.add({title: 'Export généré'})
  if (created) emit('updated', created as TimeAndTravelExport)
}
</script>

<template>
  <UForm class="flex gap-2 flex-col" :state="state" :validate="validate" @submit="onSubmit" @error="onError">
    <UFormField label="Période" name="selectedRange" required>
      <UPopover v-model:open="dateRangePopoverOpen">
        <UButton
          icon="i-heroicons-calendar-days-20-solid"
          color="neutral"
          variant="outline"
          block
          :label="selectedRange ? formatDateRangeReadable(selectedRange) || 'Choisir une plage' : 'Choisir une plage'"
        />
        <template #content>
          <GenericDateRangePicker
            :date-range="selectedRange"
            :season-selectors="false"
            @range-updated="(range) => { dateRangePopoverOpen = false; selectedRange = range as DateRange }"
          />
        </template>
      </UPopover>
    </UFormField>

    <UButton :loading="isCreating" block type="submit">
      Générer
    </UButton>
    <UButton class="mt-2" color="neutral" variant="ghost" block @click="emit('canceled')">
      Annuler
    </UButton>
  </UForm>
</template>
