<script lang="ts" setup>
import type {FormError, TableRow} from "#ui/types";
import type {NuxtError} from "#app";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import MileageRateQuery from "~/composables/api/query/clubDependent/plugin/timeAndTravel/MileageRateQuery";
import GlobalSettingQuery from "~/composables/api/query/GlobalSettingQuery";
import {GlobalSettingPublicEnum} from "~/types/api/item/globalSetting";
import type {MileageRate} from "~/types/api/item/clubDependent/plugin/timeAndTravel/mileageRate";
import {VEHICLE_CATEGORY_LABELS, VehicleCategory} from "~/types/api/item/clubDependent/plugin/timeAndTravel/mileageRate";

definePageMeta({
  layout: "super-admin"
});

useHead({
  title: 'Barème kilométrique'
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const apiQuery = new MileageRateQuery();
const globalSettingQuery = new GlobalSettingQuery();

const apiItems: Ref<MileageRate[]> = ref([])
const isLoading = ref(true);
const selectedItem: Ref<MileageRate | undefined> = ref(undefined)
const isSideVisible = ref(false);

const electricBonusPercent = ref<number | undefined>(undefined)
const electricBonusSettingIri = ref<string | undefined>(undefined)
const isSavingBonus = ref(false)

const columns = [
  {accessorKey: 'category', header: 'Catégorie'},
  {accessorKey: 'fiscalPower', header: 'Puissance fiscale'},
  {accessorKey: 'tierMaxKm', header: 'Palier'},
  {accessorKey: 'rate', header: 'Taux (€/km)'},
  {accessorKey: 'addend', header: 'Forfait (€)', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'actions', header: ''},
]

getItemsPaginated()
loadElectricBonus()

async function getItemsPaginated() {
  isLoading.value = true
  const {items} = await apiQuery.getAll(new URLSearchParams({'order[category]': 'asc', 'order[minFiscalPower]': 'asc', 'order[tierOrder]': 'asc', itemsPerPage: '100'}))
  apiItems.value = items
  isLoading.value = false
}

async function loadElectricBonus() {
  const {retrieved} = await globalSettingQuery.get(GlobalSettingPublicEnum.TIME_AND_TRAVEL_ELECTRIC_BONUS_RATE)
  electricBonusSettingIri.value = retrieved?.['@id']
  electricBonusPercent.value = retrieved?.value ? Math.round(Number(retrieved.value) * 100) : 20
}

async function saveElectricBonus() {
  if (electricBonusPercent.value === undefined || !electricBonusSettingIri.value) return
  isSavingBonus.value = true
  const {error} = await globalSettingQuery.patch(
    {'@id': electricBonusSettingIri.value},
    {value: String(electricBonusPercent.value / 100)}
  )
  isSavingBonus.value = false
  if (error) {
    toast.add({color: 'error', title: 'Erreur', description: error.message})
    return
  }
  toast.add({title: 'Majoration électrique enregistrée'})
}

function fiscalPowerLabel(row: MileageRate): string {
  if (row.minFiscalPower === null && row.maxFiscalPower === null) return 'Toutes puissances'
  if (row.minFiscalPower === null) return `${row.maxFiscalPower} CV et moins`
  if (row.maxFiscalPower === null) return `${row.minFiscalPower} CV et plus`
  if (row.minFiscalPower === row.maxFiscalPower) return `${row.minFiscalPower} CV`
  return `${row.minFiscalPower} à ${row.maxFiscalPower} CV`
}

function tierLabel(row: MileageRate): string {
  return row.tierMaxKm ? `Jusqu'à ${row.tierMaxKm} km` : 'Au-delà'
}

function rowClicked(_event: Event, row: TableRow<MileageRate>) {
  selectedItem.value = {...row.original}
  isSideVisible.value = true
}

function createItem() {
  selectedItem.value = {
    category: VehicleCategory.Car,
    minFiscalPower: null,
    maxFiscalPower: null,
    tierOrder: 1,
    tierMaxKm: null,
    rate: '0.000',
    addend: '0.00',
  }
  isSideVisible.value = true
}

async function updateItem(item: MileageRate) {
  isLoading.value = true

  const payload: MileageRate = {
    category: item.category,
    minFiscalPower: item.minFiscalPower ?? null,
    maxFiscalPower: item.maxFiscalPower ?? null,
    tierOrder: item.tierOrder,
    tierMaxKm: item.tierMaxKm ?? null,
    rate: String(item.rate),
    addend: String(item.addend),
  }

  let apiError: NuxtError | undefined = undefined
  if (!item.id) {
    const {error, created} = await apiQuery.post(payload)
    apiError = error
    selectedItem.value = created
  } else {
    const {error, updated} = await apiQuery.patch(item, payload)
    apiError = error
    selectedItem.value = updated
  }

  isLoading.value = false
  isSideVisible.value = false

  if (apiError) {
    toast.add({color: 'error', title: !item.id ? 'La création a échoué' : 'La modification a échoué', description: apiError.message})
    return
  }

  toast.add({title: !item.id ? 'Ligne créée' : 'Ligne modifiée'})
  await getItemsPaginated()
}

async function deleteItem() {
  if (!selectedItem.value) return
  isLoading.value = true
  const {error} = await apiQuery.delete(selectedItem.value)
  isLoading.value = false

  if (error) {
    toast.add({color: 'error', title: 'La suppression a échoué', description: error.message})
    return
  }

  selectedItem.value = undefined
  await getItemsPaginated()
}

const validate = (state: MileageRate): FormError[] => {
  const errors: FormError[] = []
  if (!state.category) errors.push({name: 'category', message: 'Champ requis'})
  if (!state.tierOrder || state.tierOrder < 1) errors.push({name: 'tierOrder', message: 'Doit être positif'})
  if (!state.rate || Number(state.rate) < 0) errors.push({name: 'rate', message: 'Doit être un nombre positif ou nul'})
  return errors
}
</script>

<template>
  <GenericLayoutContentWithSlideover v-model="isSideVisible" tabindex="-1">
    <template #main>
      <div class="flex flex-col gap-4">
        <UCard>
          <div class="text-lg font-bold mb-2">Majoration véhicule électrique</div>
          <p class="text-sm text-muted mb-4">
            En cas d'utilisation d'un véhicule électrique, le montant de l'indemnité kilométrique est majoré de ce pourcentage.
          </p>
          <div class="flex items-end gap-2">
            <UFormField label="Majoration (%)">
              <UInput v-model.number="electricBonusPercent" type="number" min="0" max="100" class="w-32" />
            </UFormField>
            <UButton :loading="isSavingBonus" @click="saveElectricBonus">Enregistrer</UButton>
          </div>
        </UCard>

        <UCard>
          <div class="flex gap-4">
            <div class="flex-1">
              <div class="text-lg font-bold">Barème kilométrique officiel</div>
              <NuxtLink to="https://www.service-public.gouv.fr/particuliers/vosdroits/F1132" target="_blank" class="text-xs underline">
                Source : service-public.gouv.fr/F1132
              </NuxtLink>
            </div>
            <UButton icon="i-heroicons-plus" @click="createItem" />
          </div>

          <UTable class="w-full mt-4" :loading="isLoading" :columns="columns" :data="apiItems" @select="rowClicked">
            <template #empty>
              <div class="py-6 text-center italic text-sm">Aucune ligne de barème.</div>
            </template>
            <template #category-cell="{ row }">{{ VEHICLE_CATEGORY_LABELS[row.original.category!] }}</template>
            <template #fiscalPower-cell="{ row }">{{ fiscalPowerLabel(row.original) }}</template>
            <template #tierMaxKm-cell="{ row }">{{ tierLabel(row.original) }}</template>
            <template #actions-cell />
          </UTable>
        </UCard>
      </div>
    </template>

    <template #side>
      <template v-if="selectedItem">
        <UForm :state="selectedItem" :validate="validate" class="flex flex-col gap-4" @submit="updateItem(selectedItem)">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Catégorie" name="category" required>
                <USelect
                  v-model="selectedItem.category"
                  :items="Object.values(VehicleCategory).map(v => ({label: VEHICLE_CATEGORY_LABELS[v], value: v}))"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Puissance fiscale min (CV, vide = pas de minimum)" name="minFiscalPower">
                <UInput v-model.number="selectedItem.minFiscalPower" type="number" min="0" class="w-full" />
              </UFormField>
              <UFormField label="Puissance fiscale max (CV, vide = pas de maximum)" name="maxFiscalPower">
                <UInput v-model.number="selectedItem.maxFiscalPower" type="number" min="0" class="w-full" />
              </UFormField>
              <UFormField label="Ordre du palier (1, 2, 3...)" name="tierOrder" required>
                <UInput v-model.number="selectedItem.tierOrder" type="number" min="1" class="w-full" />
              </UFormField>
              <UFormField label="Distance max du palier (km, vide = illimité)" name="tierMaxKm">
                <UInput v-model.number="selectedItem.tierMaxKm" type="number" min="0" class="w-full" />
              </UFormField>
              <UFormField label="Taux (€/km)" name="rate" required>
                <UInput v-model="selectedItem.rate" type="number" step="0.0001" min="0" class="w-full" />
              </UFormField>
              <UFormField label="Forfait additionnel (€)" name="addend">
                <UInput v-model="selectedItem.addend" type="number" step="0.01" min="0" class="w-full" />
              </UFormField>
            </div>
          </UCard>

          <UButton type="submit" block :loading="isLoading">Enregistrer</UButton>

          <UButton
            v-if="selectedItem.id"
            block
            color="error"
            :loading="isLoading"
            @click="
              overlayDeleteConfirmation.open({
                async onDelete() {
                  await deleteItem()
                  overlayDeleteConfirmation.close(true)
                }
              })
            "
          >
            Supprimer
          </UButton>
        </UForm>
      </template>
    </template>
  </GenericLayoutContentWithSlideover>
</template>
