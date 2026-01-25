<script lang="ts" setup>
import {useSelfUserStore} from "~/stores/useSelfUser";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import ModalSelectProfile from "~/components/Modal/ModalSelectProfile.vue";
import UserQuery from "~/composables/api/query/UserQuery";

definePageMeta({
  layout: "member"
});

useHead({
  title: "Mes informations"
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const userQuery = new UserQuery();

const selfStore = useSelfUserStore()
const isAdmin = selfStore.isAdmin()

const { member, user, selectedProfile } = storeToRefs(selfStore)

const passwordState = reactive({
  current: undefined as string|undefined,
  new: undefined as string|undefined,
  new2: undefined as string|undefined
})

async function onUpdatePasswordSubmit() {
  if (!user.value) return failedPasswordUpdate();

  if ((!isAdmin && (!passwordState.new || passwordState.new.length < 8)) || passwordState.new !== passwordState.new2) {
    return failedPasswordUpdate("Les mot de passe ne correspondent pas / trop court")
  }

  if (!passwordState.current) {
    return failedPasswordUpdate("Mot de passe actuel non défini")
  }

  const { error } = await userQuery.selfUpdatePassword(passwordState.current, passwordState.new)
  if (error) {
    return failedPasswordUpdate(error.message)
  }

  toast.add({
    color: "success",
    title: "Mot de passe modifié"
  })
}

function failedPasswordUpdate(explanation?: string) {
  toast.add({
    color: "error",
    title: "La modification du mot de passe a échoué",
    description: explanation
  })
}

async function deleteUser() {
  if (!user.value) return;

  const { error } = await userQuery.selfDelete()
  if (error) {
    toast.add({
      color: "error",
      title: "La suppression du compte à échoué",
      description: error.message
    })
    return
  }

  toast.add({
    color: "success",
    title: "Compte supprimé"
  })
  selfStore.logout()
}

</script>

<template>
  <div>
    <div v-if="user" class="mb-4">
      <div class="flex flex-col md:flex-row justify-between mb-4 gap-2">
        <div class="text-3xl font-bold">Mon compte</div>
        <div class="flex-1"/>

        <UModal>
          <UButton icon="i-heroicons-lock-closed" >
            Changer le mot de passe
          </UButton>

          <template #content>
            <div>
              <UCard>
                <UForm :state="passwordState" class="space-y-4" @submit="onUpdatePasswordSubmit">

                  <UFormField label="Mot de passe actuel" name="password">
                    <UInput v-model="passwordState.current" type="password" required />
                  </UFormField>

                  <UFormField label="Nouveau mot de passe" name="password">
                    <UInput v-model="passwordState.new" type="password" required />
                  </UFormField>

                  <UFormField label="Confirmation nouveau mot de passe" name="password">
                    <UInput v-model="passwordState.new2" type="password" required />
                  </UFormField>

                  <UButton type="submit">
                    Changer le mot de passe
                  </UButton>
                </UForm>
              </UCard>
            </div>
          </template>
        </UModal>

        <UButton
          icon="i-heroicons-trash"
          color="error"
          @click="
          overlayDeleteConfirmation.open({
            alertTitle: 'Seul le compte sera supprimé.',
            alertDescription: 'Pour supprimer les enregistrements liée au club (présences, fiche membre), veuillez faire une demande auprès du club.',
            alertColor: 'error',
            onDelete() {
              deleteUser()
              overlayDeleteConfirmation.close(true)
            }
          })"
        >
          Supprimer
        </UButton>
      </div>

      <UCard>
        <div class="flex flex-col gap-4 relative">

          <div class="h-24 w-24 aspect-square self-center">
            <UAvatar
              class="w-full h-full"
              size="3xl"
              :alt="user.fullName"
              :ui="{
                rounded: 'object-contain bg-gray-100 dark:bg-gray-800'
              }"
            />
          </div>

          <div class="text-center text-2xl font-bold">
            {{ user.fullName }}
          </div>

          <div class="flex flex-col justify-center">

            <div class="flex justify-center items-center">
              <UIcon class="mr-2" name="i-heroicons-at-symbol" />
              <UButton variant="link" :to="'mailto:' + user.email">{{ user.email }}</UButton>
            </div>
          </div>

        </div>
      </UCard>
    </div>

    <div class="flex flex-col md:flex-row justify-between mb-4">
      <div v-if="selectedProfile?.club" class="text-3xl font-bold">{{ selectedProfile?.club.name }}</div>
      <div class="flex-1"/>
      <UButton
        v-if="(user?.linkedProfiles?.length ?? 0) > 1"
        color="warning"
        @click="overlay.create(ModalSelectProfile).open()">
        Changer de profil
      </UButton>
    </div>

    <MemberDetails v-if="member" :member="member" />
    <GenericCard v-else class="text-center" title="Compte liée à aucun club">
      <p>Veuillez vous assurer que l'adresse mail du compte correspond à celle enregistré auprès de votre club.</p>
      <p>Si ce n'est pas le cas, veuillez le signaler à votre club pour que celui-ci modifie le compte lié.</p>
    </GenericCard>
  </div>
</template>
