<script setup lang="ts">
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import SalePaymentTerminalConnectionQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalConnectionQuery";
import SalePaymentModeQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentModeQuery";
import type {SalePaymentTerminal, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import {getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {SalePaymentTerminalConnection} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminalConnection";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";
import type {TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import ModalTerminalConnectionSetup from "~/components/Sale/ModalTerminalConnectionSetup.vue";
import type {ConnectionSetupResult} from "~/components/Sale/ModalTerminalConnectionSetup.vue";
import type {TablePaginateInterface} from "~/types/table";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import {formatDateTime} from "~/utils/date";
import {toIri} from "~/utils/resource";

definePageMeta({
  layout: "pos"
});

useHead({
  title: 'Terminaux de paiement'
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const overlayConnectionSetup = overlay.create(ModalTerminalConnectionSetup)
const selfStore = useSelfUserStore();
const canEdit = computed(() => selfStore.can(Permission.SalePaymentTerminalsEdit));

const terminalQuery = new SalePaymentTerminalQuery()
const connectionQuery = new SalePaymentTerminalConnectionQuery()
const paymentModeQuery = new SalePaymentModeQuery()

// Auto-save for free-text fields (description/icon) — debounced, keeps the panel open while typing.
// Destructured (rather than kept as a single object) so `isSavingDetails` is a top-level ref,
// auto-unwrapped in the template — accessing a ref nested in a plain returned object would not be.
const {save: saveDetail, isSaving: isSavingDetails} = useAutoSave<SalePaymentTerminal>(terminalQuery, {
  onSaved: (updated) => syncLocalTerminal(updated.uuid, updated),
  onError: (error) => toast.add({color: "error", title: "La modification a échouée", description: error.message}),
})

// ─────────────────────────────────────────────────────────────────────────
// Connections
// ─────────────────────────────────────────────────────────────────────────

const connections: Ref<SalePaymentTerminalConnection[]> = ref([])
const isLoadingConnections = ref(true)
const syncingConnectionUuid = ref<string | undefined>(undefined)

const connectionsByIri = computed(() => new Map(connections.value.map(c => [c['@id'], c])))

async function loadConnections() {
  isLoadingConnections.value = true
  const {items} = await connectionQuery.getAll()
  connections.value = items
  isLoadingConnections.value = false
}
loadConnections()

const connectionColumns = [
  {accessorKey: 'available', header: 'Disponible'},
  {accessorKey: 'name', header: 'Nom'},
  {accessorKey: 'provider', header: 'Fournisseur'},
  {accessorKey: 'forceTerminalSelection', header: 'Toujours lister lors d\'une vente'},
  {accessorKey: 'lastSyncedAt', header: 'Dernière synchronisation'},
  {accessorKey: 'actions', header: ''},
]

function providerLabel(value?: string): string {
  return getTerminalProvider(value)?.label ?? value ?? ''
}

function createConnection() {
  overlayConnectionSetup.open({
    async onSubmit(result: ConnectionSetupResult) {
      if (result.mode !== 'create') return
      const {created, error} = await connectionQuery.post({
        name: result.name,
        provider: result.provider as SalePaymentTerminalConnection['provider'],
        available: true,
        forceTerminalSelection: false,
        credentials: result.credentials,
      })
      if (error || !created) {
        toast.add({color: "error", title: "La création a échoué", description: error?.message})
        return
      }
      toast.add({color: "success", title: "Connexion créée"})
      overlayConnectionSetup.close(true)
      await loadConnections()
    },
  })
}

function editConnection(connection: SalePaymentTerminalConnection) {
  overlayConnectionSetup.open({
    connection,
    async onSubmit(result: ConnectionSetupResult) {
      if (result.mode !== 'edit') return
      const payload: Partial<SalePaymentTerminalConnection> = {name: result.name}
      if (Object.keys(result.credentials).length > 0) {
        payload.credentials = result.credentials
      }
      const {error} = await connectionQuery.patch(connection, payload)
      if (error) {
        toast.add({color: "error", title: "La modification a échoué", description: error.message})
        return
      }
      toast.add({color: "success", title: "Connexion modifiée"})
      overlayConnectionSetup.close(true)
      await loadConnections()
    },
  })
}

async function toggleConnectionField(connection: SalePaymentTerminalConnection, field: 'available' | 'forceTerminalSelection') {
  const {error} = await connectionQuery.patch(connection, {[field]: connection[field]})
  if (error) {
    toast.add({color: "error", title: "La modification a échoué", description: error.message})
    await loadConnections()
    return
  }
  toast.add({color: "success", title: "Connexion modifiée"})
}

async function syncDevices(connection: SalePaymentTerminalConnection) {
  syncingConnectionUuid.value = connection.uuid
  const {item, error} = await connectionQuery.syncDevices(connection)
  syncingConnectionUuid.value = undefined

  if (error || !item) {
    toast.add({color: "error", title: "La synchronisation a échoué", description: error?.message})
    await loadConnections()
    return
  }

  toast.add({
    color: "success",
    title: "Terminaux synchronisés",
    description: `${item.devicesFound} terminal(aux) détecté(s), ${item.devicesCreated} nouveau(x).`,
  })
  await Promise.all([loadConnections(), getTerminalsPaginated()])
}

function deleteConnection(connection: SalePaymentTerminalConnection) {
  overlayDeleteConfirmation.open({
    async onDelete() {
      const {error} = await connectionQuery.delete(connection)
      if (error) {
        toast.add({color: "error", title: "La suppression a échoué", description: error.message})
        return
      }
      overlayDeleteConfirmation.close(true)
      await Promise.all([loadConnections(), getTerminalsPaginated()])
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Devices
// ─────────────────────────────────────────────────────────────────────────

const terminals: Ref<SalePaymentTerminal[]> = ref([])
const paymentModes: Ref<SalePaymentMode[]> = ref([])
const paymentModesByIri = computed(() => new Map(paymentModes.value.map(m => [m['@id'], m])))
const isLoading = ref(true);
const totalTerminals = ref(0)
const selectedTerminal: Ref<SalePaymentTerminal | undefined> = ref(undefined)

async function loadPaymentModes() {
  const {items} = await paymentModeQuery.getAll()
  paymentModes.value = items
}
loadPaymentModes()

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

  const {retrieved, error} = await terminalQuery.deviceStatus(terminal)

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
  {accessorKey: 'available', header: 'Disponible'},
  {
    accessorKey: 'name',
    header: 'Nom',
    meta: {class: {th: 'w-full'}}
  },
  {accessorKey: 'connection', header: 'Connexion'},
  {accessorKey: 'paymentMode', header: 'Mode de paiement'},
]

getTerminalsPaginated()

async function getTerminalsPaginated() {
  isLoading.value = true

  const urlParams = new URLSearchParams({
    pagination: '1',
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  });

  const {totalItems, items} = await terminalQuery.getAll(urlParams)
  terminals.value = items
  if (totalItems) totalTerminals.value = totalItems

  isLoading.value = false
}

function connectionOf(terminal: SalePaymentTerminal): SalePaymentTerminalConnection | undefined {
  const iri = toIri(terminal.connection)
  return iri ? connectionsByIri.value.get(iri) : undefined
}

function paymentModeNameOf(terminal: SalePaymentTerminal): string | undefined {
  const iri = toIri(terminal.paymentMode)
  return iri ? paymentModesByIri.value.get(iri)?.name : undefined
}

/** A device is stale if it wasn't seen on the connection's most recent sync (never deleted, just flagged). */
function isStale(terminal: SalePaymentTerminal): boolean {
  const connection = connectionOf(terminal)
  if (!connection?.lastSyncedAt) return false
  if (!terminal.lastSeenAt) return true
  return new Date(terminal.lastSeenAt).getTime() < new Date(connection.lastSyncedAt).getTime()
}

function rowClicked(row: TableRow<SalePaymentTerminal>) {
  selectedTerminal.value = {...row.original, paymentMode: toIri(row.original.paymentMode)}
  isVisible.value = true
}

/** Merge a patched result into the local terminals array without a network reload. */
function syncLocalTerminal(uuid: string | undefined, patch: Partial<SalePaymentTerminal>) {
  if (!uuid) return
  const idx = terminals.value.findIndex(t => t.uuid === uuid)
  if (idx !== -1) terminals.value[idx] = {...terminals.value[idx], ...patch}
}

async function patchTerminal(terminal: SalePaymentTerminal, payload: Partial<SalePaymentTerminal>) {
  const {updated, error} = await terminalQuery.patch(terminal, payload)

  if (error) {
    toast.add({color: "error", title: "La modification a échouée", description: error.message})
    return
  }
  toast.add({color: "success", title: "Terminal modifié"})
  syncLocalTerminal(terminal.uuid, updated ?? payload)
}

async function toggleAvailable(terminal: SalePaymentTerminal) {
  await patchTerminal(terminal, {available: terminal.available})
}

async function deleteTerminal() {
  isLoading.value = true
  const {error} = await terminalQuery.delete(selectedTerminal.value)
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
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex gap-4 mb-4 items-center">
        <div class="text-lg font-bold flex-1">Connexions</div>
        <UButton v-if="canEdit" icon="i-heroicons-plus" @click="createConnection()">
          Ajouter une connexion
        </UButton>
      </div>

      <UTable
        class="w-full"
        :loading="isLoadingConnections"
        :columns="connectionColumns"
        :data="connections"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucune connexion configurée.</span>
          </div>
        </template>

        <template #available-cell="{ row }">
          <USwitch
            :model-value="row.original.available"
            :disabled="!canEdit"
            @update:model-value="(v: boolean) => { row.original.available = v; toggleConnectionField(row.original, 'available') }"
          />
        </template>

        <template #provider-cell="{ row }">
          {{ providerLabel(row.original.provider) }}
        </template>

        <template #forceTerminalSelection-cell="{ row }">
          <USwitch
            :model-value="row.original.forceTerminalSelection"
            :disabled="!canEdit"
            @update:model-value="(v: boolean) => { row.original.forceTerminalSelection = v; toggleConnectionField(row.original, 'forceTerminalSelection') }"
          />
        </template>

        <template #lastSyncedAt-cell="{ row }">
          <span class="text-sm text-gray-500">{{ formatDateTime(row.original.lastSyncedAt ?? undefined) ?? 'Jamais' }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div v-if="canEdit" class="flex items-center gap-1 justify-end">
            <UButton
              size="xs"
              variant="soft"
              icon="i-heroicons-arrow-path"
              :loading="syncingConnectionUuid === row.original.uuid"
              :disabled="!row.original.configured"
              @click="syncDevices(row.original)"
            >
              Synchroniser
            </UButton>
            <UButton size="xs" variant="ghost" icon="i-heroicons-pencil-square" @click="editConnection(row.original)" />
            <UButton size="xs" variant="ghost" color="error" icon="i-heroicons-trash" @click="deleteConnection(row.original)" />
          </div>
        </template>
      </UTable>
    </UCard>

    <GenericLayoutContentWithStickySide
      :has-side-content="isVisible"
      :mobile-side-title="selectedTerminal?.name"
      tabindex="-1"
      @keyup.esc="isVisible = false; selectedTerminal = undefined"
    >
      <template #main>
        <UCard>
          <div>
            <div class="text-lg font-bold mb-4">Terminaux</div>

            <UTable
              class="w-full"
              :loading="isLoading"
              :columns="columns"
              :data="terminals"
              @select="(evt, row) => rowClicked(row)"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">Aucun terminal de paiement. Ajoutez une connexion puis synchronisez.</span>
                </div>
              </template>

              <template #available-cell="{ row }">
                <USwitch class="pointer-events-none" :model-value="row.original.available" />
              </template>

              <template #name-cell="{ row }">
                <div class="flex items-center gap-2">
                  {{ row.original.name }}
                  <UTooltip v-if="isStale(row.original)" text="Non détecté à la dernière synchronisation">
                    <UBadge color="warning" variant="subtle" size="sm">
                      <UIcon name="i-heroicons-exclamation-triangle" />
                    </UBadge>
                  </UTooltip>
                </div>
              </template>

              <template #connection-cell="{ row }">
                {{ connectionOf(row.original)?.name ?? '—' }}
              </template>

              <template #paymentMode-cell="{ row }">
                {{ paymentModeNameOf(row.original) ?? '—' }}
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
                <div class="flex items-center gap-2">
                  <div class="text-lg font-bold">{{ selectedTerminal.name }}</div>
                  <UTooltip v-if="isSavingDetails" text="Enregistrement...">
                    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-muted text-xs" />
                  </UTooltip>
                </div>
                <div class="text-sm text-gray-500">{{ connectionOf(selectedTerminal)?.name }}</div>
              </div>

              <UFormField label="Disponible" name="available">
                <USwitch v-model="selectedTerminal.available" @update:model-value="toggleAvailable(selectedTerminal)" />
              </UFormField>

              <UFormField label="Description" name="description" description="Affichée sur la carte de sélection à la caisse.">
                <UInput
                  v-model="selectedTerminal.description"
                  placeholder="Ex: Caisse principale"
                  @update:model-value="(v: string) => saveDetail(selectedTerminal, {description: v})"
                />
              </UFormField>

              <UFormField label="Icône" name="icon">
                <template #description>
                  <ContentLink variant="link" to="https://heroicons.com/" target="_blank">Liste des icônes Heroicons</ContentLink>
                </template>

                <template v-if="selectedTerminal.icon" #hint>
                  <UIcon :name="'i-heroicons-' + selectedTerminal.icon" />
                </template>

                <UInput
                  v-model="selectedTerminal.icon"
                  placeholder="Ex: credit-card"
                  @update:model-value="(v: string) => saveDetail(selectedTerminal, {icon: v})"
                />
              </UFormField>

              <UFormField
                label="Mode de paiement"
                name="paymentMode"
                description="Le mode de paiement sous lequel ce terminal sera proposé à la caisse."
              >
                <USelectMenu
                  v-model="selectedTerminal.paymentMode"
                  :items="[{ label: 'Aucun', value: null }, ...paymentModes.map(m => ({ label: m.name, value: m['@id'] }))]"
                  value-key="value"
                  label-key="label"
                  placeholder="Aucun mode de paiement"
                  @update:model-value="(v: string | null) => patchTerminal(selectedTerminal, {paymentMode: v})"
                />
              </UFormField>

              <!-- Test connection -->
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
                    <dt>Dernière activité</dt><dd class="text-right">{{ formatDateTime(deviceStatus.lastActivity) }}</dd>
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
  </div>
</template>

<style scoped lang="css">
</style>
