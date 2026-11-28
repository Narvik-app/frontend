<script setup lang="ts">
import type {PropType} from "vue";
import type {User} from "~/types/api/item/user";
import UserQuery from "~/composables/api/query/UserQuery";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import ModalWithActions from "~/components/Modal/ModalWithActions.vue";
import {useSelfUserStore} from "~/stores/useSelfUser";

const props = defineProps({
  user: {
    type: Object as PropType<User>,
    required: true
  }
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)
const selfStore = useSelfUserStore()
const userQuery = new UserQuery()

const isPasswordOpen = ref(false)
const isUpdatingPassword = ref(false)
const passwordState = reactive({
  current: undefined as string | undefined,
  new: undefined as string | undefined,
  new2: undefined as string | undefined
})

async function onUpdatePasswordSubmit() {
  if ((!selfStore.isAdmin() && (!passwordState.new || passwordState.new.length < 8)) || passwordState.new !== passwordState.new2) {
    return failedPasswordUpdate("Les mot de passe ne correspondent pas / trop court")
  }

  if (!passwordState.current) {
    return failedPasswordUpdate("Mot de passe actuel non défini")
  }

  isUpdatingPassword.value = true
  const { error } = await userQuery.selfUpdatePassword(passwordState.current, passwordState.new)
  isUpdatingPassword.value = false
  if (error) {
    return failedPasswordUpdate(error.message)
  }

  toast.add({ color: "success", title: "Mot de passe modifié" })
  isPasswordOpen.value = false
  passwordState.current = passwordState.new = passwordState.new2 = undefined
}

function failedPasswordUpdate(explanation?: string) {
  toast.add({
    color: "error",
    title: "La modification du mot de passe a échoué",
    description: explanation
  })
}

function confirmDeleteAccount() {
  overlayDeleteConfirmation.open({
    alertTitle: 'Seul le compte sera supprimé.',
    alertDescription: 'Pour supprimer les enregistrements liée au club (présences, fiche membre), veuillez faire une demande auprès du club.',
    alertColor: 'error',
    async onDelete() {
      overlayDeleteConfirmation.close(true)
      const { error } = await userQuery.selfDelete()
      if (error) {
        toast.add({ color: "error", title: "La suppression du compte à échoué", description: error.message })
        return
      }
      toast.add({ color: "success", title: "Compte supprimé" })
      selfStore.logout()
    }
  })
}
</script>

<template>
  <UCard>
    <div class="text-xl font-bold mb-2">Connexion & sécurité</div>

    <dl class="divide-y divide-default text-sm">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
        <dt class="text-muted">Email</dt>
        <dd class="break-all">{{ props.user.email }}</dd>
      </div>
      <div class="flex items-center justify-between gap-4 py-2">
        <dt class="text-muted">Mot de passe</dt>
        <dd>
          <UButton size="sm" variant="soft" icon="i-heroicons-lock-closed" @click="isPasswordOpen = true">
            Changer
          </UButton>
        </dd>
      </div>
    </dl>

    <USeparator class="my-3" />

    <div class="flex flex-col gap-2">
      <div class="text-sm font-semibold text-error">Zone sensible</div>
      <p class="text-xs text-muted">La suppression du compte est définitive. Votre fiche membre reste gérée par le club.</p>
      <UButton
        size="sm"
        color="error"
        variant="outline"
        icon="i-heroicons-trash"
        class="self-start"
        @click="confirmDeleteAccount"
      >
        Supprimer mon compte
      </UButton>
    </div>

    <ModalWithActions v-model:open="isPasswordOpen" title="Changer le mot de passe" @close="isPasswordOpen = false">
      <UForm id="self-password-form" :state="passwordState" class="space-y-4" @submit="onUpdatePasswordSubmit">
        <UFormField label="Mot de passe actuel" name="current">
          <UInput v-model="passwordState.current" type="password" autocomplete="current-password" required class="w-full" />
        </UFormField>

        <UFormField label="Nouveau mot de passe" name="new">
          <UInput v-model="passwordState.new" type="password" autocomplete="new-password" required class="w-full" />
        </UFormField>

        <UFormField label="Confirmation nouveau mot de passe" name="new2">
          <UInput v-model="passwordState.new2" type="password" autocomplete="new-password" required class="w-full" />
        </UFormField>
      </UForm>

      <template #actions>
        <UButton type="submit" form="self-password-form" :loading="isUpdatingPassword">
          Changer le mot de passe
        </UButton>
      </template>
    </ModalWithActions>
  </UCard>
</template>
