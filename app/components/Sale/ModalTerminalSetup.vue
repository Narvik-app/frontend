<script setup lang="ts">
/**
 * Provider-agnostic, multi-step terminal setup modal.
 *
 * Step 1: collect the provider credentials (from TerminalProviderDefinition.credentialFields)
 *         and validate them. For providers that list devices, validation = listing devices.
 * Step 2: pick the device (with live online/offline status). Skipped for providers that
 *         can't list devices (the device id field, if any, is collected in step 1 instead).
 *
 * Emits `submit` with the full terminal payload { name, provider, credentials }.
 */
import ModalWithActions from "~/components/Modal/ModalWithActions.vue";
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import {getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {SalePaymentTerminal, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";

const props = defineProps<{
  provider: string;
  /** Pre-fill the terminal name (e.g. when reconfiguring) */
  initialName?: string;
}>()

const emit = defineEmits<{
  submit: [payload: SalePaymentTerminal]
  close: [boolean]
}>()

const toast = useToast()
const query = new SalePaymentTerminalQuery()

const definition = computed(() => getTerminalProvider(props.provider))

const step = ref<1 | 2>(1)
const isLoading = ref(false)

// Step 1 — credentials
const credentials = ref<Record<string, string>>({})
const name = ref(props.initialName ?? '')

// Step 2 — devices
const devices = ref<TerminalDevice[]>([])
const selectedDeviceId = ref<string | undefined>(undefined)

const step1Valid = computed(() => {
  const def = definition.value
  if (!def) return false
  if (!name.value?.trim()) return false
  return def.credentialFields.every(f => !f.required || !!credentials.value[f.key]?.trim())
})

async function validateAndNext() {
  const def = definition.value
  if (!def) return

  // Provider can't list devices → submit directly with step-1 credentials
  if (!def.supportsDeviceListing) {
    submit()
    return
  }

  isLoading.value = true
  const {item, error} = await query.listDevices(props.provider, cleanedCredentials())
  isLoading.value = false

  if (error || !item) {
    toast.add({
      color: "error",
      title: "Identifiants invalides",
      description: error?.message ?? "Impossible de récupérer les terminaux.",
    })
    return
  }

  devices.value = item.devices
  // Pre-select the first available (online) device, else the first one
  selectedDeviceId.value = (item.devices.find(d => d.available) ?? item.devices[0])?.id
  step.value = 2
}

function submit() {
  const def = definition.value
  if (!def) return

  const finalCredentials = cleanedCredentials()
  if (def.supportsDeviceListing && def.deviceCredentialKey && selectedDeviceId.value) {
    finalCredentials[def.deviceCredentialKey] = selectedDeviceId.value
  }

  emit('submit', {
    name: name.value.trim(),
    provider: props.provider as SalePaymentTerminal['provider'],
    available: true,
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
    :title="`Configurer ${definition?.label ?? 'le terminal'}`"
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

      <UFormField
        v-for="field in definition?.credentialFields ?? []"
        :key="field.key"
        :label="field.label"
        :name="field.key"
        :required="field.required"
        :help="field.help"
      >
        <UInput
          v-model="credentials[field.key]"
          :type="field.secret ? 'password' : 'text'"
          :placeholder="field.required ? 'Requis' : 'Optionnel'"
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
