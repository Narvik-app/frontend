<script setup lang="ts">
import TimeAndTravelExportQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/TimeAndTravelExportQuery'
import type {TimeAndTravelExport} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelExport'
import type {FormError, FormErrorEvent} from '#ui/types'
import {formatDateInput} from '~/utils/date'

const emit = defineEmits(['updated', 'canceled'])

const toast = useToast()
const exportQuery = new TimeAndTravelExportQuery()

const label = ref('')
const startDate = ref<Date | null>(null)
const endDate = ref<Date | null>(null)
const isCreating = ref(false)

const state = computed(() => ({label: label.value, startDate: startDate.value, endDate: endDate.value}))

const validate = (): FormError[] => {
  const errors: FormError[] = []
  if (!startDate.value) errors.push({name: 'startDate', message: 'Champ requis'})
  if (!endDate.value) errors.push({name: 'endDate', message: 'Champ requis'})
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

async function onSubmit() {
  if (!startDate.value || !endDate.value) return
  isCreating.value = true

  const payload = {
    startDate: formatDateInput(startDate.value.toString()),
    endDate: formatDateInput(endDate.value.toString()),
    label: label.value || undefined,
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
    <UFormField label="Nom (optionnel)" name="label">
      <UInput v-model="label" class="w-full" placeholder="Ex : Saison 2025/2026" />
    </UFormField>

    <UFormField label="Date de début" name="startDate" required>
      <GenericDatePickerField v-model="startDate" placeholder="Choisir une date" />
    </UFormField>

    <UFormField label="Date de fin" name="endDate" required>
      <GenericDatePickerField v-model="endDate" placeholder="Choisir une date" />
    </UFormField>

    <UButton :loading="isCreating" block type="submit">
      Générer
    </UButton>
    <UButton class="mt-2" color="neutral" variant="ghost" block @click="emit('canceled')">
      Annuler
    </UButton>
  </UForm>
</template>
