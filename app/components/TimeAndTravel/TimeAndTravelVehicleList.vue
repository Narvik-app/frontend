<script setup lang="ts">
import type {PropType} from 'vue'
import type {Member} from '~/types/api/item/clubDependent/member'
import type {MemberVehicle} from '~/types/api/item/clubDependent/plugin/timeAndTravel/memberVehicle'
import {VEHICLE_ENGINE_TYPE_LABELS} from '~/utils/timeAndTravel'
import MemberVehicleQuery from '~/composables/api/query/clubDependent/plugin/timeAndTravel/MemberVehicleQuery'
import ModalDeleteConfirmation from '~/components/Modal/ModalDeleteConfirmation.vue'
import {displayApiError} from '~/utils/resource'
import {useSelfUserStore} from '~/stores/useSelfUser'

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: false,
    default: undefined,
  },
  canEdit: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfStore = useSelfUserStore()

const vehicleQuery = computed(() => new MemberVehicleQuery(props.member))
// On the club-wide board (no member prop), creating targets the logged-in user's own member.
const selfMember = computed(() => props.member ?? selfStore.member)

const vehicles = ref<MemberVehicle[]>([])
const isLoading = ref(true)
const modalOpen = ref(false)
// When true, the member picker stays visible above the form (creating "for any member");
// when false, the member is fixed (self, or the vehicle's existing owner while editing).
const showMemberPicker = ref(false)
const selectedVehicle = ref<MemberVehicle | undefined>()
const selectedVehicleMember = ref<Member | undefined>()

const columns = props.member
  ? [
      {accessorKey: 'vehicle', header: 'Véhicule', meta: {class: {th: 'w-full'}}},
      {accessorKey: 'licensePlate', header: 'Immatriculation'},
      {accessorKey: 'engineType', header: 'Motorisation'},
      {accessorKey: 'currentYear', header: 'Cette année'},
      {accessorKey: 'isEnabled', header: 'Actif'},
      {accessorKey: 'actions', header: ''},
    ]
  : [
      {accessorKey: 'member', header: 'Membre'},
      {accessorKey: 'vehicle', header: 'Véhicule', meta: {class: {th: 'w-full'}}},
      {accessorKey: 'licensePlate', header: 'Immatriculation'},
      {accessorKey: 'engineType', header: 'Motorisation'},
      {accessorKey: 'currentYear', header: 'Cette année'},
      {accessorKey: 'isEnabled', header: 'Actif'},
      {accessorKey: 'actions', header: ''},
    ]

async function loadVehicles() {
  isLoading.value = true
  const {items, error} = await vehicleQuery.value.getAll()
  if (error) {
    displayApiError(error)
  } else {
    vehicles.value = items
  }
  isLoading.value = false
}

function getMemberName(vehicle: MemberVehicle): string {
  return typeof vehicle.member === 'object' ? vehicle.member?.fullName ?? '-' : '-'
}

function onCreateForSelf() {
  selectedVehicle.value = undefined
  selectedVehicleMember.value = selfMember.value
  showMemberPicker.value = false
  modalOpen.value = true
}

function onCreateForAnyMember() {
  selectedVehicle.value = undefined
  selectedVehicleMember.value = undefined
  showMemberPicker.value = true
  modalOpen.value = true
}

function onEdit(vehicle: MemberVehicle) {
  selectedVehicle.value = {...vehicle}
  selectedVehicleMember.value = props.member ?? (vehicle.member && typeof vehicle.member === 'object' ? vehicle.member : undefined)
  showMemberPicker.value = false
  modalOpen.value = true
}

function onUpdated() {
  modalOpen.value = false
  showMemberPicker.value = false
  selectedVehicle.value = undefined
  loadVehicles()
}

async function onDelete(vehicle: MemberVehicle) {
  const {error} = await vehicleQuery.value.delete(vehicle)
  if (error) {
    toast.add({color: 'error', title: 'Suppression impossible', description: error.message})
    return
  }
  toast.add({title: 'Véhicule supprimé'})
  loadVehicles()
}

loadVehicles()
</script>

<template>
  <UCard>
    <div class="flex justify-between items-center mb-4">
      <div class="text-xl font-bold">Véhicules</div>
      <div v-if="canEdit" class="flex gap-2">
        <UButton icon="i-heroicons-plus" @click="selfMember && member ? onCreateForSelf() : onCreateForAnyMember()">
          Ajouter un véhicule
        </UButton>
      </div>
    </div>

    <UTable :loading="isLoading" :columns="columns" :data="vehicles">
      <template #empty>
        <div class="py-6 text-center italic text-sm">Aucun véhicule enregistré.</div>
      </template>
      <template #member-cell="{ row }">{{ getMemberName(row.original) }}</template>
      <template #vehicle-cell="{ row }">{{ row.original.brand }} {{ row.original.model }}</template>
      <template #engineType-cell="{ row }">{{ VEHICLE_ENGINE_TYPE_LABELS[row.original.engineType!] ?? row.original.engineType }}</template>
      <template #currentYear-cell="{ row }">
        <span v-if="row.original.currentYearKilometers" class="text-sm">
          {{ row.original.currentYearKilometers }} km · {{ row.original.currentYearEstimatedAmount }} €
        </span>
        <span v-else class="text-sm text-muted">-</span>
      </template>
      <template #isEnabled-cell="{ row }">
        <USwitch :model-value="row.original.isEnabled" disabled />
      </template>
      <template #actions-cell="{ row }">
        <div v-if="canEdit" class="flex gap-2 justify-end">
          <UButton icon="i-heroicons-pencil" color="neutral" variant="ghost" @click="onEdit(row.original)" />
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            @click="overlayDeleteConfirmation.open({
              alertTitle: `Suppression du véhicule ${row.original.brand} ${row.original.model ?? ''}`,
              alertColor: 'error',
              async onDelete() {
                await onDelete(row.original)
                overlayDeleteConfirmation.close(true)
              }
            })"
          />
        </div>
      </template>
    </UTable>
  </UCard>

  <UModal v-model:open="modalOpen">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <GenericMemberPicker v-if="showMemberPicker" v-model="selectedVehicleMember" label="Membre" />
          <TimeAndTravelVehicleForm
            v-if="selectedVehicleMember"
            :item="selectedVehicle"
            :member="selectedVehicleMember"
            @updated="onUpdated"
          />
        </div>
      </UCard>
    </template>
  </UModal>
</template>
