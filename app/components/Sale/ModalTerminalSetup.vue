<script setup lang="ts">
/**
 * Provider-agnostic, multi-step terminal setup modal.
 *
 * CREATE mode (no `terminal` prop):
 *   Step 1: collect provider credentials and validate them (= list devices).
 *   Step 2: pick the device (with live online/offline status).
 *
 * RECONFIGURE mode (`terminal` prop set):
 *   Credentials are already stored (write-only, never returned), so their fields are
 *   locked. "Vérifier et continuer" lists devices using the stored credentials
 *   server-side, then the device can be re-selected.
 *
 * Emits `submit` with a discriminated result the parent persists.
 */
import ModalWithActions from "~/components/Modal/ModalWithActions.vue";
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import {getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {SalePaymentTerminal, TerminalDevice, ListDevicesResult} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {NuxtError} from "#app";

type SetupResult =
  | { mode: 'create'; name: string; provider: string; credentials: Record<string, string> }
  | { mode: 'reconfigure'; name: string; deviceId: string }

const props = defineProps<{
  provider: string;
  /** When set, the modal runs in reconfigure mode for this existing terminal */
  terminal?: SalePaymentTerminal;
  /** Pre-fill the terminal name (create mode) */
  initialName?: string;
}>()

const emit = defineEmits<{
  submit: [result: SetupResult]
  close: [boolean]
}>()

const toast = useToast()
const query = new SalePaymentTerminalQuery()

const definition = computed(() => getTerminalProvider(props.provider))
const isReconfigure = computed(() => !!props.terminal)

const step = ref<1 | 2>(1)
const isLoading = ref(false)

// Step 1 — credentials
const credentials = ref<Record<string, string>>({})
const name = ref(props.terminal?.name ?? props.initialName ?? '')

// Step 2 — devices
const devices = ref<TerminalDevice[]>([])
const selectedDeviceId = ref<string | undefined>(undefined)

const step1Valid = computed(() => {
  const def = definition.value
  if (!def) return false
  if (!name.value?.trim()) return false
  // In reconfigure mode credentials are stored — only the name is editable
  if (isReconfigure.value) return true
  return def.credentialFields.every(f => !f.required || !!credentials.value[f.key]?.trim())
})

async function validateAndNext() {
  const def = definition.value
  if (!def) return

  // Provider can't list devices → submit directly with step-1 credentials (create only)
  if (!def.supportsDeviceListing) {
    submit()
    return
  }

  isLoading.value = true
  // Reconfigure: list using the terminal's stored credentials; Create: use entered credentials
  let result: ListDevicesResult | undefined
  let error: NuxtError | undefined
  if (isReconfigure.value && props.terminal) {
    const res = await query.terminalDevices(props.terminal)
    result = res.retrieved
    error = res.error
  } else {
    const res = await query.listDevices(props.provider, cleanedCredentials())
    result = res.item
    error = res.error
  }
  isLoading.value = false

  if (error || !result) {
    toast.add({
      color: "error",
      title: isReconfigure.value ? "Connexion impossible" : "Identifiants invalides",
      description: error?.message ?? "Impossible de récupérer les terminaux.",
    })
    return
  }

  devices.value = result.devices
  // Pre-select the first available (online) device, else the first one
  selectedDeviceId.value = (result.devices.find(d => d.available) ?? result.devices[0])?.id
  step.value = 2
}

function submit() {
  const def = definition.value
  if (!def) return

  if (isReconfigure.value) {
    if (!selectedDeviceId.value) return
    emit('submit', {mode: 'reconfigure', name: name.value.trim(), deviceId: selectedDeviceId.value})
    return
  }

  const finalCredentials = cleanedCredentials()
  if (def.supportsDeviceListing && def.deviceCredentialKey && selectedDeviceId.value) {
    finalCredentials[def.deviceCredentialKey] = selectedDeviceId.value
  }

  emit('submit', {
    mode: 'create',
    name: name.value.trim(),
    provider: props.provider,
    credentials: finalCredentials,
  })
}

function cleanedCredentials(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(credentials.value)) {
    if (v !== undefined && v !== '') out[k] = v
  }
  return out
}

const canSubmitStep2 = computed(() => !!selectedDeviceId.value)
</script>

<template>
  <ModalWithActions
    :title="`${isReconfigure ? 'Reconfigurer' : 'Configurer'} ${definition?.label ?? 'le terminal'}`"
    :dismissible="false"
    :display-cancel-button="false"
  >
    <!-- Steps indicator -->
    <div v-if="definition?.supportsDeviceListing" class="flex items-center justify-center gap-2 text-sm mb-2">
      <UBadge :color="step === 1 ? 'primary' : 'neutral'" variant="subtle">1. Identifiants</UBadge>
      <UIcon name="i-heroicons-chevron-right" />
      <UBadge :color="step === 2 ? 'primary' : 'neutral'" variant="subtle">2. Terminal</UBadge>
    </div>

    <!-- STEP 1 — credentials -->
    <div v-if="step === 1" class="flex flex-col gap-3">
      <UFormField label="Nom" name="name" required>
        <UInput v-model="name" placeholder="Ex: Terminal caisse 1" />
      </UFormField>

      <UAlert
        v-if="isReconfigure"
        color="neutral"
        variant="subtle"
        icon="i-heroicons-lock-closed"
        description="Les identifiants enregistrés ne sont pas modifiables ici. Vérifiez la connexion pour sélectionner un terminal. Pour changer les identifiants, supprimez et recréez le terminal."
      />

      <UFormField
        v-for="field in definition?.credentialFields ?? []"
        :key="field.key"
        :label="field.label"
        :name="field.key"
        :required="!isReconfigure && field.required"
        :help="field.help"
      >
        <UInput
          v-model="credentials[field.key]"
          :type="field.secret ? 'password' : 'text'"
          :disabled="isReconfigure"
          :placeholder="isReconfigure ? '•••••••• (enregistré)' : (field.required ? 'Requis' : 'Optionnel')"
        />
      </UFormField>
    </div>

    <!-- STEP 2 — device selection -->
    <div v-else class="flex flex-col gap-3">
      <p class="text-sm text-gray-500">Sélectionnez le terminal à associer :</p>

      <div v-if="devices.length === 0" class="text-sm italic text-center py-4">
        Aucun terminal trouvé sur ce compte.
      </div>

      <div
        v-for="device in devices"
        :key="device.id"
        class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition"
        :class="selectedDeviceId === device.id ? 'border-primary ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700'"
        @click="selectedDeviceId = device.id"
      >
        <UIcon
          :name="selectedDeviceId === device.id ? 'i-heroicons-check-circle-solid' : 'i-heroicons-stop-circle'"
          class="text-xl"
          :class="selectedDeviceId === device.id ? 'text-primary' : 'text-gray-400'"
        />
        <UIcon name="i-heroicons-device-phone-mobile" class="text-xl" />
        <div class="flex-1">
          <div class="font-medium">{{ device.name }}</div>
          <div class="text-xs text-gray-500">
            {{ device.model ?? device.id }}
          </div>
        </div>
        <UBadge :color="device.online ? 'success' : 'warning'" variant="subtle">
          <UIcon :name="device.online ? 'i-heroicons-signal' : 'i-heroicons-signal-slash'" class="mr-1" />
          {{ device.online ? 'En ligne' : 'Hors ligne' }}
        </UBadge>
      </div>

      <p v-if="selectedDeviceId && !devices.find(d => d.id === selectedDeviceId)?.online" class="text-xs text-warning">
        ⚠ Ce terminal est actuellement hors ligne. Vous pourrez l'enregistrer, mais les paiements échoueront tant qu'il n'est pas en ligne.
      </p>
    </div>

    <template #actions>
      <div class="flex gap-2 justify-between w-full">
        <UButton color="neutral" variant="ghost" @click="step === 2 ? (step = 1) : emit('close', false)">
          {{ step === 2 ? 'Retour' : 'Annuler' }}
        </UButton>

        <UButton
          v-if="step === 1"
          :loading="isLoading"
          :disabled="!step1Valid"
          @click="validateAndNext"
        >
          {{ definition?.supportsDeviceListing ? 'Vérifier et continuer' : 'Enregistrer' }}
        </UButton>
        <UButton
          v-else
          :disabled="!canSubmitStep2"
          @click="submit"
        >
          Enregistrer
        </UButton>
      </div>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">
</style>
