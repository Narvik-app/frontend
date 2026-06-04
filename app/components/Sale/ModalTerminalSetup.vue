<script setup lang="ts">
/**
 * Provider-agnostic, multi-step terminal setup modal driven by UStepper.
 *
 * CREATE mode (no `terminal` prop):
 *   Step 1 — Provider:     pick the provider from a dropdown.
 *   Step 2 — Credentials:  name + provider credential fields; validated by listing devices.
 *   Step 3 — Terminal:     pick the physical device (only for providers with supportsDeviceListing).
 *
 * RECONFIGURE mode (`terminal` prop set):
 *   Provider step is shown but locked/disabled — start on Credentials step.
 *   Credentials fields are locked (stored, never returned); "Vérifier" lists devices
 *   using stored credentials server-side; device can be re-picked.
 *
 * Back navigation: click any completed step in the stepper header to go back.
 * Future steps are disabled (non-clickable) until reached.
 *
 * Adding a new provider: add an entry to TERMINAL_PROVIDERS in salePaymentTerminal.ts.
 * No modal code change required.
 */
import SalePaymentTerminalQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalQuery";
import {TERMINAL_PROVIDER_OPTIONS, getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {ListDevicesResult, SalePaymentTerminal, TerminalDevice} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {NuxtError} from "#app";

type SetupResult =
  | { mode: 'create'; name: string; provider: string; credentials: Record<string, string> }
  | { mode: 'reconfigure'; name: string; deviceId: string }

const props = defineProps<{
  /** Absent in create mode (user picks in the Provider step). Present in reconfigure mode. */
  provider?: string;
  /** When set, the modal is in reconfigure mode for this terminal. */
  terminal?: SalePaymentTerminal;
  onSubmit: (result: SetupResult) => void
}>()

const emit = defineEmits<{
  close: [boolean]
}>()

const toast = useToast()
const query = new SalePaymentTerminalQuery()

const isReconfigure = computed(() => !!props.terminal)

// ── Step registry ──────────────────────────────────────────────────────────
const PROVIDER_STEP_ID = 'provider'

const selectedProviderValue = ref<string>(props.provider ?? '')
const definition = computed(() => getTerminalProvider(selectedProviderValue.value))

/** All step ids in order: provider + provider-specific steps */
const allStepIds = computed(() => {
  const providerSteps = definition.value?.steps.map(s => s.id) ?? []
  return [PROVIDER_STEP_ID, ...providerSteps]
})

// ── Navigation state ───────────────────────────────────────────────────────
/** The currently visible step */
const activeStep = ref<string>(
  isReconfigure.value ? (definition.value?.steps[0]?.id ?? PROVIDER_STEP_ID) : PROVIDER_STEP_ID
)

/** Steps the user has passed through (enables clicking back in stepper header) */
const completedSteps = ref<Set<string>>(
  isReconfigure.value ? new Set([PROVIDER_STEP_ID]) : new Set()
)

/** Stepper items: provider step + provider-specific steps */
const stepperItems = computed(() => {
  const providerSteps = (definition.value?.steps ?? []).map(s => ({
    value: s.id,
    title: s.title,
    icon: s.icon,
    disabled: !completedSteps.value.has(s.id) && activeStep.value !== s.id,
  }))

  return [
    {
      value: PROVIDER_STEP_ID,
      title: 'Fournisseur',
      icon: 'i-heroicons-building-storefront',
      disabled: isReconfigure.value || (!completedSteps.value.has(PROVIDER_STEP_ID) && activeStep.value !== PROVIDER_STEP_ID),
    },
    ...providerSteps,
  ]
})

/** Index of the currently active step */
const activeStepIndex = computed(() => allStepIds.value.indexOf(activeStep.value))

/** Whether there's a previous step the user can navigate back to */
const hasPrev = computed(() => {
  // Can't go back to provider step in reconfigure mode
  const minIndex = isReconfigure.value ? 1 : 0
  return activeStepIndex.value > minIndex
})

function onStepperChange(value: string | number | undefined) {
  if (typeof value !== 'string') return
  // Only allow navigating to completed steps or current step (guard against future steps)
  if (value === activeStep.value) return
  if (completedSteps.value.has(value) || (!isReconfigure.value && value === PROVIDER_STEP_ID)) {
    activeStep.value = value
  }
}

function goBack() {
  const minIndex = isReconfigure.value ? 1 : 0
  const prev = allStepIds.value[Math.max(minIndex, activeStepIndex.value - 1)]
  if (prev) activeStep.value = prev
}

function advanceToNext() {
  completedSteps.value.add(activeStep.value)
  const next = allStepIds.value[activeStepIndex.value + 1]
  if (next) activeStep.value = next
}

// ── Step 1 — Provider ──────────────────────────────────────────────────────
const providerStepValid = computed(() => !!selectedProviderValue.value)

function onProviderSelected(value: string) {
  selectedProviderValue.value = value
  // Reset any progress past credentials when provider changes
  completedSteps.value = new Set()
  credentials.value = {}
  devices.value = []
  selectedDeviceId.value = undefined
}

function nextFromProvider() {
  if (!providerStepValid.value) return
  // When provider changes (create), provider step becomes first provider-specific step
  const nextStep = definition.value?.steps[0]?.id
  if (!nextStep) return
  completedSteps.value.add(PROVIDER_STEP_ID)
  activeStep.value = nextStep
}

// ── Step 2 — Credentials ───────────────────────────────────────────────────
const name = ref(props.terminal?.name ?? '')
const credentials = ref<Record<string, string>>({})
const isVerifying = ref(false)

const credentialsStepValid = computed(() => {
  const def = definition.value
  if (!def) return false
  if (!name.value.trim()) return false
  if (isReconfigure.value) return true // credentials are stored, only name needed
  return def.credentialFields.every(f => !f.required || !!credentials.value[f.key]?.trim())
})

async function nextFromCredentials() {
  const def = definition.value
  if (!def) return

  // Provider has no device listing → submit directly
  if (!def.supportsDeviceListing) {
    submit()
    return
  }

  isVerifying.value = true
  let result: ListDevicesResult | undefined
  let error: NuxtError | undefined

  if (isReconfigure.value && props.terminal) {
    const res = await query.terminalDevices(props.terminal)
    result = res.retrieved
    error = res.error
  } else {
    const res = await query.listDevices(selectedProviderValue.value, cleanedCredentials())
    result = res.item
    error = res.error
  }
  isVerifying.value = false

  if (error || !result) {
    toast.add({
      color: "error",
      title: isReconfigure.value ? "Connexion impossible" : "Identifiants invalides",
      description: error?.message ?? "Impossible de récupérer les terminaux.",
    })
    return
  }

  devices.value = result.devices
  selectedDeviceId.value = (result.devices.find(d => d.available) ?? result.devices[0])?.id
  advanceToNext()
}

function cleanedCredentials(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(credentials.value)) {
    if (v !== undefined && v !== '') out[k] = v
  }
  return out
}

// ── Step 3 — Device ────────────────────────────────────────────────────────
const devices = ref<TerminalDevice[]>([])
const selectedDeviceId = ref<string | undefined>(undefined)

const deviceStepValid = computed(() => !!selectedDeviceId.value)

// ── Submit ─────────────────────────────────────────────────────────────────
function submit() {
  const def = definition.value
  if (!def) return

  if (isReconfigure.value) {
    if (!selectedDeviceId.value && def.supportsDeviceListing) return
    props.onSubmit({
      mode: 'reconfigure',
      name: name.value.trim(),
      deviceId: selectedDeviceId.value ?? '',
    })
    return
  }

  const finalCredentials = cleanedCredentials()
  if (def.supportsDeviceListing && def.deviceCredentialKey && selectedDeviceId.value) {
    finalCredentials[def.deviceCredentialKey] = selectedDeviceId.value
  }

  props.onSubmit({
    mode: 'create',
    name: name.value.trim(),
    provider: selectedProviderValue.value,
    credentials: finalCredentials,
  })
}

// ── Primary button per step ────────────────────────────────────────────────
const primaryButtonLabel = computed(() => {
  if (activeStep.value === PROVIDER_STEP_ID) return 'Continuer'
  if (activeStep.value === 'credentials') {
    const def = definition.value
    if (!def?.supportsDeviceListing) return 'Enregistrer'
    return 'Vérifier et continuer'
  }
  return 'Enregistrer'
})

const primaryButtonDisabled = computed(() => {
  if (activeStep.value === PROVIDER_STEP_ID) return !providerStepValid.value
  if (activeStep.value === 'credentials') return !credentialsStepValid.value || isVerifying.value
  if (activeStep.value === 'device') return !deviceStepValid.value
  return false
})

const primaryButtonLoading = computed(() => activeStep.value === 'credentials' && isVerifying.value)

function onPrimaryClick() {
  if (activeStep.value === PROVIDER_STEP_ID) { nextFromProvider(); return }
  if (activeStep.value === 'credentials') { void nextFromCredentials(); return }
  if (activeStep.value === 'device') { submit(); return }
}
</script>

<template>
  <UModal :dismissible="false">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <!-- Title -->
          <div class="text-xl font-bold text-center">
            {{ isReconfigure ? 'Reconfigurer le terminal' : 'Ajouter un terminal' }}
          </div>

          <!-- UStepper navigation -->
          <UStepper
            v-model="activeStep"
            :items="stepperItems"
            orientation="horizontal"
            size="sm"
            @update:model-value="onStepperChange"
          />

          <!-- ── Step content ── -->

          <!-- Provider -->
          <div v-if="activeStep === 'provider'" class="flex flex-col gap-3">
            <UFormField label="Fournisseur" name="provider" required>
              <USelect
                :model-value="selectedProviderValue"
                :items="TERMINAL_PROVIDER_OPTIONS"
                value-key="value"
                label-key="label"
                placeholder="Sélectionnez un fournisseur"
                @update:model-value="onProviderSelected"
              />
            </UFormField>
          </div>

          <!-- Credentials -->
          <div v-else-if="activeStep === 'credentials'" class="flex flex-col gap-3">
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

          <!-- Device -->
          <div v-else-if="activeStep === 'device'" class="flex flex-col gap-3">
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
                class="text-xl shrink-0"
                :class="selectedDeviceId === device.id ? 'text-primary' : 'text-gray-400'"
              />
              <UIcon name="i-heroicons-device-phone-mobile" class="text-xl shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ device.name }}</div>
                <div class="text-xs text-gray-500 truncate">{{ device.model ?? device.id }}</div>
              </div>
              <UBadge :color="device.online ? 'success' : 'warning'" variant="subtle" class="shrink-0">
                <UIcon :name="device.online ? 'i-heroicons-signal' : 'i-heroicons-signal-slash'" class="mr-1" />
                {{ device.online ? 'En ligne' : 'Hors ligne' }}
              </UBadge>
            </div>

            <p v-if="selectedDeviceId && !devices.find(d => d.id === selectedDeviceId)?.online" class="text-xs text-warning">
              ⚠ Ce terminal est actuellement hors ligne. Vous pourrez l'enregistrer, mais les paiements échoueront tant qu'il n'est pas en ligne.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 justify-between">
            <UButton
              color="neutral"
              variant="ghost"
              @click="hasPrev ? goBack() : emit('close', false)"
            >
              {{ hasPrev ? 'Retour' : 'Annuler' }}
            </UButton>

            <UButton
              :loading="primaryButtonLoading"
              :disabled="primaryButtonDisabled"
              @click="onPrimaryClick"
            >
              {{ primaryButtonLabel }}
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped lang="css">
</style>
