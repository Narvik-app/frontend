<script setup lang="ts">
/**
 * Create/edit a TPE provider connection (shared credentials for one provider
 * account, e.g. one SumUp merchant). Devices are discovered separately via
 * "Synchroniser les terminaux" (SalePaymentTerminalConnectionQuery.syncDevices) —
 * this modal only manages the connection itself, no device step.
 *
 * CREATE mode (no `connection` prop): pick provider, enter all credential fields,
 * "Vérifier et créer" validates them (lists devices) before submitting.
 *
 * EDIT mode (`connection` prop set): provider is locked, name is editable, and
 * credential fields are optional — leave them blank to keep the stored
 * credentials unchanged, or fill them all in to replace them (validated first).
 *
 * Adding a new provider: add an entry to TERMINAL_PROVIDERS in salePaymentTerminal.ts.
 * No modal code change required.
 */
import SalePaymentTerminalConnectionQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentTerminalConnectionQuery";
import {TERMINAL_PROVIDER_OPTIONS, getTerminalProvider} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";
import type {SalePaymentTerminalConnection} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminalConnection";

export type ConnectionSetupResult =
  | { mode: 'create'; name: string; provider: string; credentials: Record<string, string> }
  | { mode: 'edit'; name: string; credentials: Record<string, string> } // credentials empty = keep unchanged

const props = defineProps<{
  /** When set, the modal edits this existing connection. */
  connection?: SalePaymentTerminalConnection;
  onSubmit: (result: ConnectionSetupResult) => void
}>()

const emit = defineEmits<{
  close: [boolean]
}>()

const toast = useToast()
const query = new SalePaymentTerminalConnectionQuery()

const isEdit = computed(() => !!props.connection)

const selectedProviderValue = ref<string>(props.connection?.provider ?? 'sumup')
const definition = computed(() => getTerminalProvider(selectedProviderValue.value))

const name = ref(props.connection?.name ?? '')
const credentials = ref<Record<string, string>>({})
const isVerifying = ref(false)

function cleanedCredentials(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(credentials.value)) {
    if (v !== undefined && v !== '') out[k] = v
  }
  return out
}

/** In edit mode, whether the cashier started typing new credentials (vs leaving them blank to keep the old ones) */
const hasCredentialInput = computed(() => Object.keys(cleanedCredentials()).length > 0)

const formValid = computed(() => {
  if (!name.value.trim()) return false
  const def = definition.value
  if (!def) return false
  if (isEdit.value && !hasCredentialInput.value) return true // keep existing credentials
  return def.credentialFields.every(f => !f.required || !!credentials.value[f.key]?.trim())
})

const primaryButtonLabel = computed(() => isEdit.value ? 'Enregistrer' : 'Vérifier et créer')

async function submit() {
  const def = definition.value
  if (!def || !formValid.value) return

  const cleaned = cleanedCredentials()
  const shouldValidate = !isEdit.value || hasCredentialInput.value

  if (shouldValidate) {
    isVerifying.value = true
    const {item, error} = await query.listDevices(selectedProviderValue.value, cleaned)
    isVerifying.value = false

    if (error || !item) {
      toast.add({
        color: "error",
        title: "Identifiants invalides",
        description: error?.message ?? "Impossible de valider les identifiants.",
      })
      return
    }
    toast.add({color: "success", title: `${item.devices.length} terminal(aux) détecté(s)`})
  }

  if (isEdit.value) {
    props.onSubmit({mode: 'edit', name: name.value.trim(), credentials: cleaned})
  }
  else {
    props.onSubmit({mode: 'create', name: name.value.trim(), provider: selectedProviderValue.value, credentials: cleaned})
  }
}
</script>

<template>
  <ModalWithActions
    :title="isEdit ? 'Modifier la connexion' : 'Ajouter une connexion'"
    :dismissible="false"
    @close="(state: boolean) => emit('close', state)"
  >
    <UFormField v-if="!isEdit" label="Fournisseur" name="provider" required>
      <USelect
        v-model="selectedProviderValue"
        :items="TERMINAL_PROVIDER_OPTIONS"
        value-key="value"
        label-key="label"
      />
    </UFormField>

    <UFormField label="Nom" name="name" required>
      <UInput v-model="name" />
    </UFormField>

    <UAlert
      v-if="isEdit"
      color="neutral"
      variant="subtle"
      icon="i-heroicons-lock-closed"
      description="Laissez les champs ci-dessous vides pour conserver les identifiants actuels."
    />

    <UFormField
      v-for="field in definition?.credentialFields ?? []"
      :key="field.key"
      :label="field.label"
      :name="field.key"
      :required="!isEdit && field.required"
      :help="field.help"
    >
      <UInput
        v-model="credentials[field.key]"
        :type="field.secret ? 'password' : 'text'"
        :placeholder="isEdit ? '••••••••' : ''"
      />
    </UFormField>

    <template #actions>
      <UButton
        :loading="isVerifying"
        :disabled="!formValid"
        @click="submit"
      >
        {{ primaryButtonLabel }}
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">
</style>
