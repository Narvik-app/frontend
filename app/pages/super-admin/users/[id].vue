<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import {type User, UserRole} from "~/types/api/item/user";
import UserQuery from "~/composables/api/query/UserQuery";
import {getAvailableClubRole} from "~/types/api/item/club";
import {convertUuidToUrlUuid} from "~/utils/resource";

definePageMeta({
  layout: "super-admin"
})

useHead({
  title: "Détail utilisateur"
})


const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const route = useRoute()

const selfStore = useSelfUserStore()

const itemId = decodeUrlUuid(route.params.id?.toString());

const isLoading = ref(true)
const itemModalOpen = ref(false)

const user: Ref<User | undefined> = ref(undefined)

const userQuery = new UserQuery()

const updatePasswordModalOpen = ref(false)
const passwordState = reactive({
  new: undefined as string|undefined,
  new2: undefined as string|undefined
})

const columns = [
  {
    accessorKey: 'displayName',
    header: 'Nom',
    meta: {
      class: {
        th: 'w-full',
      }
    }
  },
  {
    accessorKey: 'club',
    header: 'Club'
  },
  {
    accessorKey: 'role',
    header: 'Rôle'
  }
]

async function loadUser() {
  isLoading.value = true
  const { retrieved, error } = await userQuery.get(itemId)
  isLoading.value = false

  if (!retrieved || error) {
    toast.add({
      color: "error",
      title: "Utilisateur non trouvé",
    })

    navigateTo('/super-admin/users')
    return
  }

  user.value = retrieved
}

async function deleteUser() {
  if (!user.value) {
    return
  }

  const { error } = await userQuery.delete(user.value)

  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    })

    return
  }
  navigateTo('/super-admin/users')
}

async function onUpdatePasswordSubmit() {
  if (!user.value) return failedPasswordUpdate();

  if (passwordState.new !== passwordState.new2) {
    return failedPasswordUpdate("Les mot de passe ne correspondent pas")
  }

  const { error } = await userQuery.patch(user.value, {
    plainPassword: passwordState.new
  } as User)
  if (error) {
    return failedPasswordUpdate(error.message)
  }

  updatePasswordModalOpen.value = false
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

// Main code
loadUser()
</script>

<template>
  <div v-if="user" class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-2">
      <UButton
        to="/super-admin/users"
        icon="i-heroicons-queue-list"
        variant="soft"
        size="xs"
        label="Liste"
      />

      <div class="flex-1 text-center font-bold text-2xl flex justify-center items-center gap-2 ">
        <p>{{ user.fullName }}</p>
        <UIcon
          :class="user.accountActivated ? 'text-success-600' : 'text-error-600'"
          :name="user.accountActivated ? 'i-heroicons-check': 'i-heroicons-x-mark'"
        />
      </div>

      <div class="flex justify-between gap-2 flex-wrap">
        <UButton icon="i-heroicons-lock-closed" @click="updatePasswordModalOpen = true" >
          Changer le mot de passe
        </UButton>

        <UButton
          icon="i-heroicons-pencil"
          color="warning"
          size="xs"
          label="Modifier"
          @click="itemModalOpen = true"
        />

        <UButton
          v-if="user.role !== UserRole.SuperAdmin"
          icon="i-heroicons-trash"
          color="error"
          size="xs"
          label="Supprimer"
          @click="
            overlayDeleteConfirmation.open({
              async onDelete() {
                await deleteUser()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        />
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <UCard class="lg:col-span-5 h-full">
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

            <div class="flex justify-center mt-4">
              <UButton color="warning" @click="selfStore.impersonateUser(user)">Impersonifier</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <div class="lg:col-span-7">
        <UCard>
          <div class="flex flex-col h-full">
            <UTable
              class="flex-1"
              :columns="columns"
              :data="user.linkedProfiles"
            >
              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">Aucun profil</span>
                </div>
              </template>

              <template #club-cell="{ row }">
                <ContentLink :to="`/super-admin/clubs/${convertUuidToUrlUuid(row.original.club.uuid)}`">{{ row.original.club.name }}</ContentLink>
              </template>

              <template #role-cell="{ row }">
                {{ getAvailableClubRole(row.original.role).text }}
              </template>
            </UTable>
          </div>
        </UCard>
      </div>
    </div>
  </div>

  <UModal
    v-model:open="itemModalOpen">
    <template #content>
      <div>
        <UCard>
          <UserForm
            :item="user ? {...user} : undefined"
            @updated="(value) => {itemModalOpen = false; loadUser() }"
          />
        </UCard>
      </div>
    </template>
  </UModal>

  <UModal
    v-if="user"
    v-model:open="updatePasswordModalOpen">
    <template #content>
      <div>
        <UCard>
          <UForm :state="passwordState" class="space-y-4" @submit="onUpdatePasswordSubmit">
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
</template>

<style scoped lang="css">

</style>
