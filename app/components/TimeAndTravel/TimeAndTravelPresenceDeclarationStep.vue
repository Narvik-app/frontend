<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {MemberPresence} from '~/types/api/item/clubDependent/plugin/presence/memberPresence'
import type {Activity} from '~/types/api/item/clubDependent/plugin/presence/activity'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import MemberTimeAndTravelDeclarationQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberTimeAndTravelDeclarationQuery'
import MemberVehicleQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberVehicleQuery'
import type {SelectApiItem} from '~/types/select'
import type {FormError, FormErrorEvent} from '#ui/types'

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true,
  },
  memberPresence: {
    type: Object as PropType<MemberPresence>,
    required: false,
    default: undefined,
  },
  activities: {
    type: Array as PropType<Activity[]>,
    required: true,
  },
})

const emit = defineEmits(['done', 'skipped'])

const toast = useToast()
const declarationQuery = new MemberTimeAndTravelDeclarationQuery(props.member)
const vehicleQuery = new MemberVehicleQuery(props.member)

const isSubmitting = ref(false)
const vehicles = ref<MemberVehicle[]>([])
const hours = ref('1.00')
const kilometers = ref(0)
const description = ref(props.activities.map(a => a.name).join(', '))

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
const selectedVehicle = ref<SelectApiItem<MemberVehicle> | undefined>()

const validate = (state: {hours: string, kilometers: number}): FormError[] => {
  const errors: FormError[] = []
  if (state.kilometers > 0 && !selectedVehicle.value) {
    errors.push({name: 'memberVehicle', message: 'Champ requis'})
  }
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({behavior: 'smooth', block: 'center'})
}

async function onSubmit() {
  isSubmitting.value = true

  const hasKilometers = kilometers.value > 0

  const payload = {
    member: props.member['@id'],
    // Only relevant (and required by the backend) once a distance is declared.
    departureLocation: hasKilometers ? 'Domicile' : null,
    arrivalLocation: hasKilometers ? 'Club' : null,
    // Both are optional (at least one is required, enforced by the backend) - never send 0, which would fail the Positive constraint.
    kilometers: hasKilometers ? Number(kilometers.value) : null,
    // The backend maps this to a decimal-as-string column: the number input can coerce it to a JS number, always send a string.
    hours: Number(hours.value) > 0 ? String(hours.value) : null,
    description: description.value || props.activities.map(a => a.name).join(', ') || 'Activité bénévole',
    isRoundtrip: hasKilometers,
    memberVehicle: hasKilometers ? (selectedVehicle.value?.item?.['@id'] ?? null) : null,
    memberPresence: props.memberPresence?.['@id'],
  }

  const {error} = await declarationQuery.post(payload)
  isSubmitting.value = false

  if (error) {
    toast.add({title: 'Une erreur est survenue', description: error.message, color: 'error'})
    return
  }

  toast.add({title: 'Déclaration enregistrée'})
  emit('done')
}
</script>

<template>
  <div>
    <div class="text-2xl">Déclaration de frais pour <b>{{ member.fullName }}</b></div>
    <p class="text-muted text-sm mt-2">
      L'activité sélectionnée permet de déclarer du temps et/ou des kilomètres. Vous pouvez passer cette étape si vous ne le souhaitez pas.
    </p>

    <UForm :state="{hours, kilometers}" :validate="validate" class="mt-4 flex flex-col gap-4" @submit="onSubmit" @error="onError">
      <UFormField label="Motif" name="description">
        <UInput v-model="description" class="w-full" />
      </UFormField>

      <UFormField label="Heures" name="hours">
        <UInput v-model="hours" type="number" step="0.25" min="0" class="w-full" />
      </UFormField>

      <UFormField label="Kilomètres" name="kilometers">
        <UInput v-model.number="kilometers" type="number" min="0" class="w-full" />
      </UFormField>

      <UFormField v-if="kilometers > 0" label="Véhicule" name="memberVehicle" required>
        <USelectMenu v-model="selectedVehicle" :items="vehicleOptions" class="w-full" placeholder="Choisir un véhicule" />
      </UFormField>

      <UButton :loading="isSubmitting" block type="submit">
        Enregistrer la déclaration
      </UButton>
      <UButton class="mt-2" color="neutral" variant="ghost" block :disabled="isSubmitting" @click="emit('skipped')">
        Passer
      </UButton>
    </UForm>
  </div>
</template>
