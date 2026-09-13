<script setup lang="ts">
import type {PropType, Ref} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {TimeAndTravelDeclaration} from '~/types/api/item/clubDependent/plugin/timeAndTravel/timeAndTravelDeclaration'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import MemberTimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelDeclarationQuery'
import MemberVehicleQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberVehicleQuery'
import type {FormError} from '#ui/types'
import type {SelectApiItem} from '~/types/select'
import {formatDateInput} from '~/utils/date'
import {DECLARATION_LOCATION_MAX_LENGTH, DECLARATION_DESCRIPTION_MAX_LENGTH, isValidHoursGranularity} from '~/utils/timeAndTravel'
import {blockNonDecimalKey} from '~/utils/string'

const props = defineProps({
  item: {
    type: Object as PropType<TimeAndTravelDeclaration>,
    required: false,
    default: undefined,
  },
  member: {
    type: Object as PropType<Member>,
    required: true,
  },
  /** Only used on create, to prefill the "Motif" field (e.g. with the presence's activity names). */
  initialDescription: {
    type: String,
    required: false,
    default: '',
  },
})

const emit = defineEmits(['updated', 'canceled'])

const toast = useToast()
const declarationQuery = new MemberTimeAndTravelDeclarationQuery(props.member)
const vehicleQuery = new MemberVehicleQuery(props.member)

// The backend always stores the total kilometers for the trip. The form asks for the one-way
// distance instead (clearer to fill in, and what a member actually knows) and doubles it before
// sending when "Aller-retour" is checked — so an existing round-trip total is halved back for display.
const item: Ref<TimeAndTravelDeclaration> = props.item ? ref(toOneWayDisplay(props.item)) : ref(getDefaultDeclaration())

function toOneWayDisplay(source: TimeAndTravelDeclaration): TimeAndTravelDeclaration {
  const clone = {...source}
  if (clone.isRoundtrip && clone.kilometers) {
    clone.kilometers = clone.kilometers / 2
  }
  return clone
}
const selectedDate = ref<Date | null>(item.value.date ? new Date(item.value.date) : new Date())
const isUpdating = ref(false)
const vehicles = ref<MemberVehicle[]>([])

vehicleQuery.getAll().then(({items}) => {
  vehicles.value = items.filter(v => v.isEnabled)
})

const vehicleOptions = computed<SelectApiItem<MemberVehicle>[]>(() => {
  return vehicles.value.map(v => ({
    label: `${v.brand} ${v.model ?? ''} — ${v.licensePlate}`,
    value: v.uuid!,
    item: v,
  }))
})
const initialVehicle = props.item?.memberVehicle && typeof props.item.memberVehicle === 'object' ? props.item.memberVehicle : undefined
const selectedVehicle = ref<SelectApiItem<MemberVehicle> | undefined>(
  initialVehicle
    ? {label: `${initialVehicle.brand} ${initialVehicle.model ?? ''}`, value: initialVehicle.uuid!, item: initialVehicle}
    : undefined
)

function getDefaultDeclaration(): TimeAndTravelDeclaration {
  return {
    date: formatDateInput(new Date().toString()) ?? '',
    description: props.initialDescription,
    isRoundtrip: true,
  }
}

// Departure/arrival, the roundtrip switch and the vehicle only make sense once a distance is declared.
const hasKilometers = computed(() => !!item.value.kilometers && item.value.kilometers > 0)

// What actually gets sent: the one-way distance, doubled when it's a round trip.
const totalKilometers = computed(() => {
  if (!hasKilometers.value) return 0
  return item.value.isRoundtrip ? Number(item.value.kilometers) * 2 : Number(item.value.kilometers)
})

const validate = (state: TimeAndTravelDeclaration): FormError[] => {
  const errors: FormError[] = []
  if (!state.description) errors.push({name: 'description', message: 'Champ requis'})

  const stateHasKilometers = !!state.kilometers && state.kilometers > 0
  const hasHours = !!state.hours && Number(state.hours) > 0
  if (!stateHasKilometers && !hasHours) {
    errors.push({name: 'kilometers', message: 'Au moins un des deux champs (km ou heures) est requis'})
    errors.push({name: 'hours', message: 'Au moins un des deux champs (km ou heures) est requis'})
  }

  if (hasHours && !isValidHoursGranularity(Number(state.hours))) {
    errors.push({name: 'hours', message: 'Les heures doivent être un multiple de 0.5 (ex : 1, 1.5, 2)'})
  }

  if (stateHasKilometers) {
    if (!state.departureLocation) errors.push({name: 'departureLocation', message: 'Champ requis'})
    if (!state.arrivalLocation) errors.push({name: 'arrivalLocation', message: 'Champ requis'})
    if (!selectedVehicle.value) errors.push({name: 'memberVehicle', message: 'Champ requis'})
  }

  return errors
}

const onError = useFormScrollToFirstError()

async function onSubmit() {
  isUpdating.value = true

  const payload: {
    departureLocation: string | null
    arrivalLocation: string | null
    kilometers: number | null
    hours: string | null
    description: string
    isRoundtrip: boolean
    memberVehicle: string | null
    member?: string
    date?: string
  } = {
    // Only relevant (and required, see validate() above / enforced by the backend) once a distance is declared.
    // Sent as an explicit null (not omitted) so editing to clear one still works under merge-patch semantics.
    departureLocation: hasKilometers.value ? (item.value.departureLocation ?? null) : null,
    arrivalLocation: hasKilometers.value ? (item.value.arrivalLocation ?? null) : null,
    // The one-way value typed in the form is doubled here when it's a round trip — the backend
    // always stores (and expects) the total, see totalKilometers above.
    kilometers: hasKilometers.value ? totalKilometers.value : null,
    // The backend maps this to a decimal-as-string column: the number input can coerce it to a JS number, always send a string.
    hours: item.value.hours ? String(item.value.hours) : null,
    description: item.value.description,
    isRoundtrip: hasKilometers.value ? item.value.isRoundtrip : false,
    memberVehicle: hasKilometers.value ? (selectedVehicle.value?.item?.['@id'] ?? null) : null,
  }

  if (!props.item) {
    payload.member = props.member['@id']
    if (selectedDate.value) {
      payload.date = formatDateInput(selectedDate.value.toString()) ?? undefined
    }
  }

  let errorMessage: string | undefined
  let savedItem: TimeAndTravelDeclaration | undefined

  if (!props.item) {
    const {created, error} = await declarationQuery.post(payload)
    if (created) savedItem = created
    if (error) errorMessage = error.message
  } else {
    const {updated, error} = await declarationQuery.patch(props.item, payload)
    if (updated) savedItem = updated
    if (error) errorMessage = error.message
  }

  isUpdating.value = false

  if (errorMessage) {
    toast.add({title: 'Une erreur est survenue', description: errorMessage, color: 'error'})
    return
  }

  toast.add({title: 'Déclaration enregistrée'})
  if (savedItem) emit('updated', savedItem)
}
</script>

<template>
  <UForm class="flex gap-2 flex-col" :state="item" :validate="validate" @submit="onSubmit" @error="onError">
    <UFormField v-if="!props.item" label="Date" name="date">
      <GenericDatePickerField v-model="selectedDate" placeholder="Choisir une date" />
    </UFormField>

    <UFormField label="Motif" name="description" required>
      <UInput
        v-model="item.description"
        data-testid="declaration-description"
        :maxlength="DECLARATION_DESCRIPTION_MAX_LENGTH"
        class="w-full"
        aria-describedby="description-character-count"
        :ui="{trailing: 'pointer-events-none'}"
      >
        <template #trailing>
          <div id="description-character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
            {{ item.description?.length ?? 0 }}/{{ DECLARATION_DESCRIPTION_MAX_LENGTH }}
          </div>
        </template>
      </UInput>
    </UFormField>

    <UFormField label="Heures" name="hours">
      <UInput v-model="item.hours" data-testid="declaration-hours" type="number" step="0.5" min="0" class="w-full" @keydown="blockNonDecimalKey" />
    </UFormField>

    <UFormField label="Kilomètres" name="kilometers">
      <UFieldGroup class="w-full">
        <UButton
          data-testid="declaration-roundtrip-toggle"
          :icon="item.isRoundtrip ? 'i-heroicons-arrows-right-left' : 'i-heroicons-arrow-long-right'"
          color="primary"
          variant="soft"
          :aria-label="item.isRoundtrip ? 'Aller-retour (cliquer pour repasser en aller simple)' : 'Aller simple (cliquer pour déclarer un aller-retour)'"
          @click="item.isRoundtrip = !item.isRoundtrip"
        />
        <UInput v-model.number="item.kilometers" data-testid="declaration-kilometers" type="number" min="0" class="flex-1" @keydown="blockNonDecimalKey" />
        <UButton v-if="item.isRoundtrip" color="primary" variant="soft" disabled>
          {{ totalKilometers }} km
        </UButton>
      </UFieldGroup>
    </UFormField>

    <template v-if="hasKilometers">
      <UFormField label="Lieu de départ" name="departureLocation" required>
        <UInput
          v-model="item.departureLocation"
          data-testid="declaration-departure"
          :maxlength="DECLARATION_LOCATION_MAX_LENGTH"
          class="w-full"
          aria-describedby="departure-location-character-count"
          :ui="{trailing: 'pointer-events-none'}"
        >
          <template #trailing>
            <div id="departure-location-character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
              {{ item.departureLocation?.length ?? 0 }}/{{ DECLARATION_LOCATION_MAX_LENGTH }}
            </div>
          </template>
        </UInput>
      </UFormField>

      <UFormField label="Lieu d'arrivée" name="arrivalLocation" required>
        <UInput
          v-model="item.arrivalLocation"
          data-testid="declaration-arrival"
          :maxlength="DECLARATION_LOCATION_MAX_LENGTH"
          class="w-full"
          aria-describedby="arrival-location-character-count"
          :ui="{trailing: 'pointer-events-none'}"
        >
          <template #trailing>
            <div id="arrival-location-character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
              {{ item.arrivalLocation?.length ?? 0 }}/{{ DECLARATION_LOCATION_MAX_LENGTH }}
            </div>
          </template>
        </UInput>
      </UFormField>

      <UFormField label="Véhicule" name="memberVehicle" required>
        <USelectMenu v-model="selectedVehicle" data-testid="declaration-vehicle" :items="vehicleOptions" class="w-full" placeholder="Choisir un véhicule" />
      </UFormField>
    </template>

    <UButton data-testid="declaration-submit" :loading="isUpdating" block type="submit">
      Enregistrer
    </UButton>
    <UButton data-testid="declaration-cancel" class="mt-2" color="error" variant="ghost" block @click="emit('canceled')">
      Annuler
    </UButton>
  </UForm>
</template>
