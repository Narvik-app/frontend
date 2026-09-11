<script setup lang="ts">
import type {PropType, Ref} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {getSelectMenuVehicleEngineType, getSelectMenuVehicleCategory, VehicleCategory, VehicleEngineType} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import MemberVehicleQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberVehicleQuery'
import MileageRateQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MileageRateQuery'
import type {MileageRate} from '~/types/api/item/clubDependent/plugin/timeAndTravel/mileageRate'
import GlobalSettingQuery from '~/composables/api/query/GlobalSettingQuery'
import {GlobalSettingPublicEnum} from '~/types/api/item/globalSetting'
import type {FormError, FormErrorEvent} from '#ui/types'
import {BAREME_OFFICIAL_SOURCE_URL} from '~/utils/baremeKilometrique'

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
const mileageRateQuery = new MileageRateQuery()
const globalSettingQuery = new GlobalSettingQuery()

const item: Ref<MemberVehicle> = props.item ? ref({...props.item}) : ref(getDefaultVehicle())
const isUpdating = ref(false)
const electricBonusPercent = ref(20)
const mileageRates = ref<MileageRate[]>([])

globalSettingQuery.get(GlobalSettingPublicEnum.TIME_AND_TRAVEL_ELECTRIC_BONUS_RATE).then(({retrieved}) => {
  if (retrieved?.value) electricBonusPercent.value = Math.round(Number(retrieved.value) * 100)
})
mileageRateQuery.getAll(new URLSearchParams({itemsPerPage: '100'})).then(({items}) => {
  mileageRates.value = items
})

const engineTypeOptions = getSelectMenuVehicleEngineType()
const categoryOptions = getSelectMenuVehicleCategory()

// The rows of the official scale matching this vehicle's category/fiscal power — purely
// informational, no calculator or manual override: the export always applies whichever tier the
// declared distance falls into.
const matchedRates = computed(() => {
  const power = item.value.fiscalPower
  if (!power) return []
  return mileageRates.value
    .filter(r => r.category === item.value.category)
    .filter(r => (r.minFiscalPower === null || r.minFiscalPower === undefined || power >= r.minFiscalPower))
    .filter(r => (r.maxFiscalPower === null || r.maxFiscalPower === undefined || power <= r.maxFiscalPower))
    .sort((a, b) => (a.tierOrder ?? 0) - (b.tierOrder ?? 0))
})

function tierLabel(rate: MileageRate): string {
  return rate.tierMaxKm ? `Jusqu'à ${rate.tierMaxKm} km` : 'Au-delà'
}

function formulaLabel(rate: MileageRate): string {
  const addend = Number(rate.addend)
  return addend > 0 ? `(km × ${rate.rate}) + ${rate.addend} €` : `km × ${rate.rate}`
}

watch(() => props.item, () => {
  item.value = props.item ? {...props.item} : getDefaultVehicle()
})

function getDefaultVehicle(): MemberVehicle {
  return {
    brand: '',
    licensePlate: '',
    engineType: VehicleEngineType.Petrol,
    category: VehicleCategory.Car,
    fiscalPower: 5,
    isEnabled: true,
  }
}

const validate = (state: MemberVehicle): FormError[] => {
  const errors: FormError[] = []
  if (!state.brand) errors.push({name: 'brand', message: 'Champ requis'})
  if (!state.licensePlate) errors.push({name: 'licensePlate', message: 'Champ requis'})
  if (!state.fiscalPower || state.fiscalPower < 1) errors.push({name: 'fiscalPower', message: 'Champ requis'})
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
    <UFormField label="Actif" name="isEnabled">
      <USwitch v-model="item.isEnabled" />
    </UFormField>

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

    <UFormField label="Catégorie (pour le barème officiel)" name="category" required>
      <USelect v-model="item.category" :items="categoryOptions" class="w-full" />
    </UFormField>

    <UFormField label="Puissance fiscale (CV)" name="fiscalPower" required>
      <UInput v-model.number="item.fiscalPower" type="number" min="1" class="w-full" />
    </UFormField>

    <p v-if="item.engineType === 'electric'" class="text-xs text-muted">
      En cas d'utilisation d'un véhicule électrique, le montant de l'indemnité kilométrique est majoré de {{ electricBonusPercent }} %.
    </p>

    <div v-if="matchedRates.length" class="rounded-md bg-elevated p-3 flex flex-col gap-1">
      <div class="text-sm font-medium mb-1">Barème appliqué</div>
      <div v-for="rate in matchedRates" :key="rate.id" class="text-sm flex justify-between gap-2">
        <span class="text-muted">{{ tierLabel(rate) }}</span>
        <span>{{ formulaLabel(rate) }}</span>
      </div>
      <NuxtLink :to="BAREME_OFFICIAL_SOURCE_URL" target="_blank" class="text-xs underline mt-1">Barème officiel</NuxtLink>
    </div>

    <UAlert
      v-if="item.currentYearKilometers"
      color="neutral"
      variant="subtle"
      title="Calcul appliqué cette année pour ce véhicule"
      :description="`${item.currentYearCalculationDescription} = ${item.currentYearEstimatedAmount} €`"
    />

    <UButton :loading="isUpdating" block type="submit">
      Enregistrer
    </UButton>
  </UForm>
</template>
