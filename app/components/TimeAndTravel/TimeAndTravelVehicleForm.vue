<script setup lang="ts">
import type {PropType, Ref} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {getSelectMenuVehicleEngineType, VehicleEngineType} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import MemberVehicleQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberVehicleQuery'
import type {FormError, FormErrorEvent} from '#ui/types'

const props = defineProps({
  item: {
    type: Object as PropType<MemberVehicle>,
    required: false,
    default: undefined,
  },
  member: {
    type: Object as PropType<Member>,
    required: true,
  },
})

const emit = defineEmits(['updated'])

const toast = useToast()
const memberVehicleQuery = new MemberVehicleQuery()

const item: Ref<MemberVehicle> = props.item ? ref({...props.item}) : ref(getDefaultVehicle())
const isUpdating = ref(false)

const engineTypeOptions = getSelectMenuVehicleEngineType()

watch(() => props.item, () => {
  item.value = props.item ? {...props.item} : getDefaultVehicle()
})

function getDefaultVehicle(): MemberVehicle {
  return {
    brand: '',
    licensePlate: '',
    engineType: VehicleEngineType.Petrol,
    fiscalPower: 5,
    fiscalCoefficient: '0.5',
    isEnabled: true,
  }
}

const validate = (state: MemberVehicle): FormError[] => {
  const errors: FormError[] = []
  if (!state.brand) errors.push({name: 'brand', message: 'Champ requis'})
  if (!state.licensePlate) errors.push({name: 'licensePlate', message: 'Champ requis'})
  if (!state.fiscalPower || state.fiscalPower < 1) errors.push({name: 'fiscalPower', message: 'Champ requis'})
  const coefficient = Number(state.fiscalCoefficient)
  if (!state.fiscalCoefficient || isNaN(coefficient) || coefficient <= 0) {
    errors.push({name: 'fiscalCoefficient', message: 'Doit être un nombre positif'})
  }
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

async function updateItem() {
  isUpdating.value = true
  const isCreate = !item.value.uuid

  const payload = {
    ...item.value,
    member: props.member['@id'],
    // The backend maps this to a decimal-as-string column: the number input can coerce it to a JS number, always send a string.
    fiscalCoefficient: String(item.value.fiscalCoefficient),
  }

  let errorMessage: string | undefined
  let savedItem: MemberVehicle | undefined

  if (isCreate) {
    const {created, error} = await memberVehicleQuery.post(payload)
    if (created) savedItem = created
    if (error) errorMessage = error.message
  } else {
    const {updated, error} = await memberVehicleQuery.patch(item.value, payload)
    if (updated) savedItem = updated
    if (error) errorMessage = error.message
  }

  isUpdating.value = false

  if (errorMessage) {
    toast.add({title: 'Une erreur est survenue', description: errorMessage, color: 'error'})
    return
  }

  if (savedItem) emit('updated', savedItem)
}
</script>

<template>
  <UForm class="flex gap-2 flex-col" :state="item" :validate="validate" @submit="updateItem" @error="onError">
    <UFormField label="Marque" name="brand" required>
      <UInput v-model="item.brand" class="w-full" />
    </UFormField>

    <UFormField label="Modèle" name="model">
      <UInput v-model="item.model" class="w-full" />
    </UFormField>

    <UFormField label="Immatriculation" name="licensePlate" required>
      <UInput v-model="item.licensePlate" class="w-full" />
    </UFormField>

    <UFormField label="Motorisation" name="engineType">
      <USelect v-model="item.engineType" :items="engineTypeOptions" class="w-full" />
    </UFormField>

    <UFormField label="Puissance fiscale (CV)" name="fiscalPower" required>
      <UInput v-model.number="item.fiscalPower" type="number" min="1" class="w-full" />
    </UFormField>

    <UFormField label="Coefficient barème kilométrique" name="fiscalCoefficient" required>
      <UInput v-model="item.fiscalCoefficient" type="number" step="0.0001" min="0" class="w-full" />
    </UFormField>

    <UFormField label="Actif" name="isEnabled">
      <USwitch v-model="item.isEnabled" />
    </UFormField>

    <UButton :loading="isUpdating" block type="submit">
      Enregistrer
    </UButton>
  </UForm>
</template>
