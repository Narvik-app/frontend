<script setup lang="ts">
import MemberControlTypeQuery from "~/composables/api/query/clubDependent/MemberControlTypeQuery";
import type {MemberControlType, WriteMemberControlType} from "~/types/api/item/clubDependent/memberControlType";
import {memberControlTypeIsLifetime} from "~/types/api/item/clubDependent/memberControlType";
import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {FormError, TableRow} from "#ui/types";
import type {SelectApiItem} from "~/types/select";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import {displayApiError} from "~/utils/resource";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Contrôles & suivis des membres'
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfStore = useSelfUserStore();
const canEdit = computed(() => selfStore.can(Permission.MemberControlTypesEdit));

const typeQuery = new MemberControlTypeQuery();
const activityQuery = new ActivityQuery();

const isLoading = ref(true)
const types: Ref<MemberControlType[]> = ref([])
const selectedType: Ref<MemberControlType | undefined> = ref(undefined)

const activities: Ref<Activity[]> = ref([])
activityQuery.getAll().then(({items}) => { activities.value = items })
const activitiesSelect = computed(() => {
  const items: SelectApiItem<Activity>[] = [{label: 'Aucune - saisie manuelle', value: undefined}]
  activities.value.forEach(activity => {
    items.push({label: activity.name, value: activity.uuid, item: activity})
  })
  return items
})

// Side menu visible
const isVisible = ref(false);
watch(selectedType, (value) => {
  isVisible.value = value !== undefined
})

const columns = [
  {accessorKey: 'icon', header: ''},
  {accessorKey: 'name', header: 'Nom', meta: {class: {th: 'w-full'}}},
  {accessorKey: 'mode', header: 'Mode'},
  {accessorKey: 'delays', header: 'Délais'},
  {accessorKey: 'displayOnPresenceCard', header: 'Page de présence'},
  {accessorKey: 'actions', header: ''},
]

async function getTypes() {
  isLoading.value = true

  const urlParams = new URLSearchParams({
    'order[weight]': 'ASC',
  });
  const {items} = await typeQuery.getAll(urlParams)
  types.value = items

  isLoading.value = false
}

function rowClicked(row: TableRow<MemberControlType>) {
  // Shallow clone, normalizing `activity` to a plain uuid so it matches the USelect's `value-key`
  selectedType.value = {...row.original, activity: row.original.activity?.uuid as unknown as undefined}
}

function createType() {
  selectedType.value = {
    name: '',
    icon: '',
    warningDays: 335,
    alertDays: 365,
    displayOnPresenceCard: true,
  }
}

async function move(row: MemberControlType, modifier: number) {
  isLoading.value = true
  const {error} = await typeQuery.move(row, modifier === 1 ? 'down' : 'up');
  isLoading.value = false

  if (error) {
    displayApiError(error, "La modification a échoué")
    return;
  }

  await getTypes();
}

async function updateType(type: MemberControlType) {
  isLoading.value = true

  // `type.activity` may be an already-hydrated Activity object (fetched from the API) or a
  // raw uuid string (just picked in the USelect below) — resolve either to a full IRI.
  let activityIri: string | null = null
  if (type.activity) {
    activityIri = typeof type.activity === 'string'
      ? `${activityQuery.getRootUrl()}/${type.activity}`
      : (type.activity['@id'] ?? null)
  }

  const payload: WriteMemberControlType = {
    name: type.name,
    icon: type.icon,
    activity: activityIri,
    warningDays: type.warningDays || null,
    alertDays: type.alertDays || null,
    displayOnPresenceCard: type.displayOnPresenceCard,
  }

  let error
  if (!type.uuid) {
    const {error: postError, created} = await typeQuery.post(payload)
    error = postError
    selectedType.value = created
  } else {
    const {error: patchError} = await typeQuery.patch(type, payload);
    error = patchError
  }

  isLoading.value = false

  if (error) {
    displayApiError(error, !type.uuid ? "La création a échoué" : "La modification a échoué")
    return;
  }

  toast.add({
    color: "success",
    title: !type.uuid ? "Contrôle créé" : "Contrôle modifié",
  });

  await getTypes()
}

async function deleteType() {
  if (!selectedType.value) return

  isLoading.value = true
  const {error} = await typeQuery.delete(selectedType.value);
  isLoading.value = false

  if (error) {
    displayApiError(error, "La suppression a échoué")
    return
  }

  toast.add({color: "success", title: "Contrôle supprimé"})
  selectedType.value = undefined
  await getTypes()
}

function daysToMonthsLabel(days: number | null | undefined): string {
  if (!days || days <= 0) return ''
  const months = days / 30.44
  const rounded = Math.round(months * 10) / 10
  return `≈ ${rounded} mois`
}

const warningDaysHint = computed(() => daysToMonthsLabel(selectedType.value?.warningDays))
const alertDaysHint = computed(() => daysToMonthsLabel(selectedType.value?.alertDays))

// With no delay configured at all, a control never expires: once a member has a date, it's
// simply "done" for good (e.g. a QCM passed once, valid for life) rather than a periodic renewal.
const isLifetimeMode = computed(() => !selectedType.value?.warningDays && !selectedType.value?.alertDays)

function toggleLifetimeMode(lifetime: boolean) {
  if (!selectedType.value) return
  if (lifetime) {
    selectedType.value.warningDays = null
    selectedType.value.alertDays = null
  } else {
    selectedType.value.warningDays = 335
    selectedType.value.alertDays = 365
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define proper form state type
const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.name) errors.push({name: 'name', message: 'Champ requis'})
  if (state.warningDays && state.alertDays && Number(state.warningDays) > Number(state.alertDays)) {
    errors.push({name: 'alertDays', message: 'Le délai d\'alerte doit être supérieur ou égal au délai d\'avertissement'})
  }
  return errors
}

getTypes()
</script>

<template>
  <GenericLayoutContentWithStickySide
    :has-side-content="isVisible"
    :mobile-side-title="selectedType?.name" tabindex="-1"
    @keyup.esc="isVisible = false; selectedType = undefined;">
    <template #main>
      <GenericCardWithActions title="Contrôles et suivis périodiques (contrôle annuel, QCM, ...)">

        <template #actions>
          <UButton v-if="canEdit" @click="createType">
            Créer un nouveau contrôle
          </UButton>
        </template>

        <template #default>
          <UTable
            :loading="isLoading"
            :columns="columns"
            :data="types"
            @select="(evt, row) => rowClicked(row)">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucun contrôle configuré</span>
                <UButton v-if="canEdit" class="mt-4" label="Créer" @click="createType()"/>
              </div>
            </template>

            <template #icon-cell="{ row }">
              <UIcon v-if="row.original.icon" :name="'i-heroicons-' + row.original.icon" class="text-lg" />
            </template>

            <template #mode-cell="{ row }">
              <UBadge v-if="row.original.activity" variant="subtle" color="primary">
                Auto
              </UBadge>
              <UBadge v-else variant="subtle" color="neutral">Manuel</UBadge>
            </template>

            <template #delays-cell="{ row }">
              <UBadge v-if="memberControlTypeIsLifetime(row.original)" variant="subtle" color="neutral">
                Sans expiration
              </UBadge>
              <span v-else class="text-xs">
                {{ row.original.warningDays ?? '—' }}j avertissement / {{ row.original.alertDays ?? '—' }}j alerte
              </span>
            </template>

            <template #displayOnPresenceCard-cell="{ row }">
              <USwitch class="pointer-events-none" :model-value="row.original.displayOnPresenceCard" />
            </template>

            <template #actions-cell="{ row }">
              <div v-if="canEdit" class="flex items-center gap-1">
                <GenericStackedUpDown @changed="modifier => move(row.original, -modifier)" />
              </div>
            </template>
          </UTable>
        </template>
      </GenericCardWithActions>
    </template>

    <template #side>
      <div v-if="selectedType && canEdit" class="flex flex-col gap-4">
        <UForm :state="selectedType" :validate="validate" @submit="updateType(selectedType)">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom" name="name">
                <UInput v-model="selectedType.name"/>
              </UFormField>

              <GenericIconPickerField v-model="selectedType.icon" placeholder="shield-check" />

              <UFormField
                label="Activité liée"
                name="activity"
              >
                <USelect
                  v-model="selectedType.activity as unknown as string"
                  :items="activitiesSelect"
                  placeholder="Aucune - saisie manuelle"
                />
              </UFormField>

              <UFormField
                label="Sans expiration"
                name="lifetime"
                description="Contrôle simple oui/non (ex: QCM), valable à vie une fois renseigné."
              >
                <USwitch :model-value="isLifetimeMode" @update:model-value="toggleLifetimeMode" />
              </UFormField>

              <template v-if="!isLifetimeMode">
                <UFormField label="Délai d'avertissement (jours)" name="warningDays" :description="warningDaysHint">
                  <UInput v-model="selectedType.warningDays" type="number"/>
                </UFormField>

                <UFormField label="Délai d'alerte (jours)" name="alertDays" :description="alertDaysHint">
                  <UInput v-model="selectedType.alertDays" type="number"/>
                </UFormField>
              </template>

              <UFormField label="Afficher sur la page de présence" name="displayOnPresenceCard">
                <USwitch v-model="selectedType.displayOnPresenceCard"/>
              </UFormField>
            </div>
          </UCard>

          <UButton class="mt-4" block type="submit" :loading="isLoading">Enregistrer</UButton>
        </UForm>

        <UButton
          v-if="selectedType.uuid"
          block
          color="error"
          :loading="isLoading"
          @click="
            overlayDeleteConfirmation.open({
              title: selectedType.name,
              async onDelete() {
                await deleteType()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        >
          Supprimer
        </UButton>
      </div>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style lang="css" scoped>

</style>
