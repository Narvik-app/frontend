<script setup lang="ts">
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import type {SalePaymentTerminal, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import ModalTerminalSetup from "~/components/Sale/ModalTerminalSetup.vue";
import type {TablePaginateInterface} from "~/types/table";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import {formatDate} from "~/utils/date";

definePageMeta({
  layout: "pos"
});

useHead({
  title: 'Terminaux de paiement'
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const overlaySetup = overlay.create(ModalTerminalSetup)
const selfStore = useSelfUserStore();
const canEdit = computed(() => selfStore.can(Permission.SalePaymentTerminalsEdit));

const apiQuery = new SalePaymentTerminalQuery()

const terminals: Ref<SalePaymentTerminal[]> = ref([])
const isLoading = ref(true);
const totalTerminals = ref(0)
const selectedTerminal: Ref<SalePaymentTerminal | undefined> = ref(undefined)

const isVisible = ref(false);
watch(selectedTerminal, (value) => {
  isVisible.value = value !== undefined
  // Reset the test-connection result when switching terminals
  deviceStatus.value = undefined
  deviceStatusError.value = undefined
})

// Test connection state
const isTestingConnection = ref(false)
const deviceStatus = ref<TerminalDevice | undefined>(undefined)
const deviceStatusError = ref<string | undefined>(undefined)

async function testConnection(terminal: SalePaymentTerminal) {
  isTestingConnection.value = true
  deviceStatus.value = undefined
  deviceStatusError.value = undefined

  const {retrieved, error} = await apiQuery.deviceStatus(terminal)

  isTestingConnection.value = false

  if (error || !retrieved) {
    deviceStatusError.value = error?.message ?? 'Impossible de récupérer le statut du terminal.'
    return
  }
  deviceStatus.value = retrieved
}

// Table settings
const page = ref(1);
const itemsPerPage = ref(30);

const columns = [
  {
    accessorKey: 'available',
    header: 'Disponible'
  },
  {
    accessorKey: 'name',
    header: 'Nom',
    meta: {
      class: {
        th: 'w-full',
      }
    }
  },
  {
    accessorKey: 'provider',
    header: 'Fournisseur'
  },
]

getTerminalsPaginated()

async function getTerminalsPaginated() {
  isLoading.value = true

  const urlParams = new URLSearchParams({
    pagination: '1',
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  });

  const {totalItems, items} = await apiQuery.getAll(urlParams)
  terminals.value = items
  if (totalItems) totalTerminals.value = totalItems

  isLoading.value = false
}

function rowClicked(row: TableRow<SalePaymentTerminal>) {
  selectedTerminal.value = {...row.original}
  isVisible.value = true
}

function providerLabel(value?: string): string {
  return getTerminalProvider(value)?.label ?? value ?? ''
}

type SetupResult =
  | { mode: 'create'; name: string; provider: string; credentials: Record<string, string> }
  | { mode: 'reconfigure'; name: string; deviceId: string }

/** Open the multi-step setup modal to create a terminal (provider picked inside) */
function createTerminal() {
  overlaySetup.open({
    async onSubmit(result: SetupResult) {
      if (result.mode !== 'create') return
      await saveNewTerminal({
        name: result.name,
        provider: result.provider as SalePaymentTerminal['provider'],
        available: true,
        credentials: result.credentials,
      })
      overlaySetup.close(true)
    },
  })
}

/** Reconfigure an existing terminal: re-pick the device (credentials stay stored) */
function reconfigureTerminal(terminal: SalePaymentTerminal) {
  overlaySetup.open({
    provider: terminal.provider ?? 'sumup',
    terminal,
    async onSubmit(result: SetupResult) {
      if (result.mode !== 'reconfigure') return
      await applyReconfigure(terminal, result.name, result.deviceId)
      overlaySetup.close(true)
    },
  })
}

async function applyReconfigure(terminal: SalePaymentTerminal, newName: string, deviceId: string) {
  isLoading.value = true

  // Update the device first (preserves stored secret credentials)
  const {error: deviceError} = await apiQuery.setDevice(terminal, deviceId)
  // Update the name if it changed
  let nameError = undefined
  if (!deviceError && newName && newName !== terminal.name) {
    const {error} = await apiQuery.patch(terminal, {name: newName} as SalePaymentTerminal)
    nameError = error
  }

  isLoading.value = false

  const error = deviceError ?? nameError
  if (error) {
    toast.add({color: "error", title: "La modification a échouée", description: error.message})
    return
  }
  toast.add({color: "success", title: "Terminal modifié"})
  selectedTerminal.value = undefined
  await getTerminalsPaginated()
}

async function saveNewTerminal(payload: SalePaymentTerminal) {
  isLoading.value = true
  const {created, error} = await apiQuery.post(payload)
  isLoading.value = false

  if (error || !created) {
    toast.add({color: "error", title: "La création a échouée", description: error?.message})
    return
  }
  toast.add({color: "success", title: "Terminal créé"})
  await getTerminalsPaginated()
}

async function patchTerminal(terminal: SalePaymentTerminal, payload: Partial<SalePaymentTerminal>) {
  isLoading.value = true
  const {error} = await apiQuery.patch(terminal, payload)
  isLoading.value = false

  if (error) {
    toast.add({color: "error", title: "La modification a échouée", description: error.message})
    return
  }
  toast.add({color: "success", title: "Terminal modifié"})
  selectedTerminal.value = undefined
  await getTerminalsPaginated()
}

async function toggleAvailable(terminal: SalePaymentTerminal) {
  await patchTerminal(terminal, {available: terminal.available})
}

async function deleteTerminal() {
  isLoading.value = true
  const {error} = await apiQuery.delete(selectedTerminal.value)
  isLoading.value = false

  if (error) {
    toast.add({color: "error", title: "La suppression a échouée", description: error.message})
    return
  }

  selectedTerminal.value = undefined
  await getTerminalsPaginated()
}
</script>

<template>
  <GenericLayoutContentWithStickySide
    :has-side-content="isVisible"
    :mobile-side-title="selectedTerminal?.name"
    tabindex="-1"
    @keyup.esc="isVisible = false; selectedTerminal = undefined"
  >
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4 mb-4 items-center">
            <div class="flex-1" />
            <UButton v-if="canEdit" icon="i-heroicons-plus" @click="createTerminal()">
              Ajouter un terminal
            </UButton>
          </div>

          <UTable
            class="w-full"
            :loading="isLoading"
            :columns="columns"
            :data="terminals"
            @select="(evt, row) => rowClicked(row)"
          >
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucun terminal de paiement.</span>
              </div>
            </template>

            <template #available-cell="{ row }">
              <USwitch class="pointer-events-none" :model-value="row.original.available" />
            </template>

            <template #name-cell="{ row }">
              {{ row.original.name }}
            </template>

            <template #provider-cell="{ row }">
              {{ providerLabel(row.original.provider) }}
            </template>
          </UTable>

          <GenericTablePagination
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :total-items="totalTerminals"
            @paginate="(_: TablePaginateInterface) => { getTerminalsPaginated() }"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedTerminal && canEdit">
        <UCard>
          <div class="flex gap-3 flex-col">
            <div>
              <div class="text-lg font-bold">{{ selectedTerminal.name }}</div>
              <div class="text-sm text-gray-500">{{ providerLabel(selectedTerminal.provider) }}</div>
            </div>

            <UFormField label="Disponible" name="available">
              <USwitch v-model="selectedTerminal.available" @update:model-value="toggleAvailable(selectedTerminal)" />
            </UFormField>

            <UButton
              block
              variant="soft"
              icon="i-heroicons-wrench-screwdriver"
              @click="reconfigureTerminal(selectedTerminal)"
            >
              Reconfigurer
            </UButton>

            <!-- Test connection -->
            <template v-if="selectedTerminal.configured">
              <UButton
                block
                variant="soft"
                icon="i-heroicons-signal"
                :loading="isTestingConnection"
                @click="testConnection(selectedTerminal)"
              >
                Tester la connexion
              </UButton>

              <div
                v-if="deviceStatus"
                class="flex flex-col gap-2 p-3 rounded-lg border"
                :class="deviceStatus.online ? 'border-success/40' : 'border-warning/40'"
              >
                <div class="flex items-center gap-2">
                  <UBadge :color="deviceStatus.online ? 'success' : 'warning'" variant="subtle">
                    <UIcon :name="deviceStatus.online ? 'i-heroicons-signal' : 'i-heroicons-signal-slash'" class="mr-1" />
                    {{ deviceStatus.online ? 'En ligne' : 'Hors ligne' }}
                  </UBadge>
                  <span class="text-sm font-medium">{{ deviceStatus.name }}</span>
                </div>

                <!-- Diagnostics -->
                <dl class="text-xs text-gray-500 grid grid-cols-2 gap-x-2 gap-y-0.5">
                  <template v-if="deviceStatus.state">
                    <!-- When offline, `state` is the last persisted state (stale), not live readiness -->
                    <dt>{{ deviceStatus.online ? 'État' : 'Dernier état connu' }}</dt>
                    <dd class="text-right">{{ deviceStatus.state }}</dd>
                  </template>
                  <template v-if="deviceStatus.connectionType">
                    <dt>Connexion</dt><dd class="text-right">{{ deviceStatus.connectionType }}</dd>
                  </template>
                  <template v-if="deviceStatus.batteryLevel != null">
                    <dt>Batterie</dt><dd class="text-right">{{ Math.round(deviceStatus.batteryLevel) }}%</dd>
                  </template>
                  <template v-if="deviceStatus.lastActivity">
                    <dt>Dernière activité</dt><dd class="text-right">{{ formatDate(deviceStatus.lastActivity) }}</dd>
                  </template>
                </dl>
              </div>

              <UAlert
                v-else-if="deviceStatusError"
                color="error"
                variant="subtle"
                icon="i-heroicons-exclamation-triangle"
                :description="deviceStatusError"
              />
            </template>
          </div>
        </UCard>

        <UButton
          block
          color="error"
          class="mt-2"
          :loading="isLoading"
          @click="
            overlayDeleteConfirmation.open({
              async onDelete() {
                await deleteTerminal()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        >
          Supprimer
        </UButton>
      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style scoped lang="css">
</style>
