<script setup lang="ts">
import {browserSupportsWebAuthn, startRegistration, WebAuthnError} from "@simplewebauthn/browser";
import ModalWithActions from "~/components/Modal/ModalWithActions.vue";
import PasskeyQuery from "~/composables/api/query/PasskeyQuery";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {WebauthnCredential} from "~/types/api/item/webauthnCredential";
import {formatDateTimeReadable} from "~/utils/date";
import {isPasskeyAborted, isPasskeyNotAllowed} from "~/utils/passkey";

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const passkeyQuery = new PasskeyQuery()

const passkeys = ref<WebauthnCredential[]>([])
const isLoading = ref(true)
const browserSupportsPasskey = ref(false)

const isAddOpen = ref(false)
const isAdding = ref(false)
const newName = ref('')
// Only the latest registration may update the state (a new one aborts the pending browser prompt)
let addId = 0

const editedPasskey = ref<WebauthnCredential | null>(null)
const editedName = ref('')
const isRenaming = ref(false)

onMounted(() => {
  browserSupportsPasskey.value = browserSupportsWebAuthn()
  loadPasskeys()
})

async function loadPasskeys() {
  isLoading.value = true
  const { items, error } = await passkeyQuery.getAll()
  isLoading.value = false
  if (error) {
    toast.add({ color: "error", title: "Impossible de charger les clés d'accès", description: error.message })
    return
  }
  passkeys.value = items
}

async function addPasskey() {
  const id = ++addId
  isAdding.value = true
  try {
    const { item: options, error } = await passkeyQuery.registrationOptions()
    if (id !== addId) return
    if (!options) {
      toast.add({ color: "error", title: "L'ajout de la clé d'accès a échoué", description: error?.message })
      return
    }

    let credential
    try {
      credential = await startRegistration({ optionsJSON: options.publicKey })
    } catch (e) {
      if (isPasskeyAborted(e)) {
        return
      }
      if (isPasskeyNotAllowed(e)) {
        toast.add({
          color: "warning",
          title: "Clé d'accès non créée",
          description: "La demande a été annulée ou a expiré."
        })
        return
      }
      const alreadyRegistered = e instanceof WebAuthnError && e.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
      toast.add({
        color: "error",
        title: "L'ajout de la clé d'accès a échoué",
        description: alreadyRegistered
          ? "Cet appareil a déjà une clé d'accès pour ce compte"
          : "Votre navigateur ou votre gestionnaire de mots de passe a refusé de créer la clé d'accès"
      })
      console.error(e)
      return
    }

    // The name is optional, the backend gives a default one
    const name = newName.value.trim() || undefined
    const { error: registerError } = await passkeyQuery.register(options.challengeId, credential, name)
    if (registerError) {
      toast.add({ color: "error", title: "L'ajout de la clé d'accès a échoué", description: registerError.message })
      return
    }

    toast.add({ color: "success", title: "Clé d'accès ajoutée", description: "Vous pouvez maintenant vous connecter sans mot de passe" })
    isAddOpen.value = false
    newName.value = ''
    await loadPasskeys()
  } finally {
    if (id === addId) {
      isAdding.value = false
    }
  }
}

function openRename(passkey: WebauthnCredential) {
  editedPasskey.value = passkey
  editedName.value = passkey.name ?? ''
}

async function renamePasskey() {
  if (!editedPasskey.value) return

  isRenaming.value = true
  const payload: WebauthnCredential = { name: editedName.value.trim() }
  const { error } = await passkeyQuery.patch(editedPasskey.value, payload)
  isRenaming.value = false
  if (error) {
    toast.add({ color: "error", title: "Le renommage a échoué", description: error.message })
    return
  }

  editedPasskey.value = null
  await loadPasskeys()
}

function confirmDelete(passkey: WebauthnCredential) {
  overlayDeleteConfirmation.open({
    alertTitle: passkey.name
      ? `La clé d'accès « ${passkey.name} » ne pourra plus être utilisée pour se connecter.`
      : "Cette clé d'accès ne pourra plus être utilisée pour se connecter.",
    alertDescription: "Pensez aussi à la supprimer du gestionnaire de mots de passe de votre appareil.",
    alertColor: 'warning',
    async onDelete() {
      const { error } = await passkeyQuery.delete(passkey)
      overlayDeleteConfirmation.close(true)
      if (error) {
        toast.add({ color: "error", title: "La suppression a échoué", description: error.message })
        return
      }
      toast.add({ color: "success", title: "Clé d'accès supprimée" })
      await loadPasskeys()
    }
  })
}
</script>

<template>
  <UCard data-testid="passkeys-card">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
      <div>
        <div class="text-xl font-bold">Clés d'accès</div>
        <p class="text-sm text-muted">
          Connectez-vous sans mot de passe avec l'empreinte digitale, la reconnaissance faciale ou le code de votre appareil.
        </p>
      </div>

      <UButton
        v-if="browserSupportsPasskey"
        icon="i-heroicons-plus"
        class="self-start sm:self-center"
        data-testid="passkey-add"
        @click="isAddOpen = true"
      >
        Ajouter
      </UButton>
    </div>

    <UAlert
      v-if="!browserSupportsPasskey"
      color="neutral"
      variant="subtle"
      icon="i-heroicons-information-circle"
      title="Ce navigateur ne prend pas en charge les clés d'accès."
      class="mb-2"
    />

    <div v-if="isLoading" class="flex justify-center py-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
    </div>

    <p v-else-if="passkeys.length === 0" class="text-sm text-muted py-2">
      Aucune clé d'accès enregistrée.
    </p>

    <ul v-else class="divide-y divide-default">
      <li v-for="passkey in passkeys" :key="passkey.uuid" class="flex items-center gap-3 py-2" data-testid="passkey-item">
        <UIcon name="i-heroicons-key" class="size-5 shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ passkey.name }}</div>
          <div class="text-xs text-muted">
            Ajoutée le {{ formatDateTimeReadable(passkey.createdAt) }}
            <template v-if="passkey.lastUsedAt"> · Utilisée le {{ formatDateTimeReadable(passkey.lastUsedAt) }}</template>
          </div>
        </div>
        <UButton icon="i-heroicons-pencil" color="neutral" variant="ghost" aria-label="Renommer" @click="openRename(passkey)" />
        <UButton icon="i-heroicons-trash" color="error" variant="ghost" aria-label="Supprimer" @click="confirmDelete(passkey)" />
      </li>
    </ul>

    <ModalWithActions v-model:open="isAddOpen" title="Ajouter une clé d'accès" @close="isAddOpen = false">
      <UForm id="passkey-add-form" :state="{ newName }" @submit="addPasskey">
        <UFormField label="Nom (optionnel)" name="name" help="Par exemple « Téléphone » ou « Enpass ».">
          <UInput v-model="newName" maxlength="100" class="w-full" data-testid="passkey-name" />
        </UFormField>
      </UForm>

      <template #actions>
        <UButton type="submit" form="passkey-add-form" :loading="isAdding" data-testid="passkey-create">
          Créer la clé d'accès
        </UButton>
      </template>
    </ModalWithActions>

    <ModalWithActions
      :open="!!editedPasskey"
      title="Renommer la clé d'accès"
      @update:open="(open: boolean) => { if (!open) editedPasskey = null }"
      @close="editedPasskey = null"
    >
      <UForm id="passkey-rename-form" :state="{ editedName }" @submit="renamePasskey">
        <UFormField label="Nom" name="name">
          <UInput v-model="editedName" maxlength="100" required class="w-full" />
        </UFormField>
      </UForm>

      <template #actions>
        <UButton type="submit" form="passkey-rename-form" :loading="isRenaming" :disabled="!editedName.trim()">
          Enregistrer
        </UButton>
      </template>
    </ModalWithActions>
  </UCard>
</template>
