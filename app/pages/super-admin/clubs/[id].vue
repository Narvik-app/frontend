<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {Club} from "~/types/api/item/club";
import ClubQuery from "~/composables/api/query/ClubQuery";
import ClubSettingQuery from "~/composables/api/query/clubDependent/ClubSettingQuery";
import FileQuery from "~/composables/api/query/FileQuery";
import {formatDateReadable} from "~/utils/date";
import dayjs from "dayjs";
import ModalClubSelectRenewDate from "~/components/Modal/Club/ModalClubSelectRenewDate.vue";
import {convertUuidToUrlUuid} from "~/utils/resource";
import UserQuery from "~/composables/api/query/UserQuery";
import type {User} from "~/types/api/item/user";
import ModalClubSelectDeletionDate from "~/components/Modal/Club/ModalClubSelectDeletionDate.vue";

definePageMeta({
  layout: "super-admin"
})

useHead({
  title: "Détail club"
})

const toast = useToast()
const overlay = useOverlay()
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const route = useRoute()

const selfStore = useSelfUserStore()

const itemId = decodeUrlUuid(route.params.id?.toString());

const isLoading = ref(true)
const isUsersLoading = ref(true)
const itemModalOpen = ref(false)

const club: Ref<Club | undefined> = ref(undefined)
const userClubs: Ref<User[]> = ref([])

const clubQuery = new ClubQuery()
const userQuery = new UserQuery()

// Table settings
const page = ref(1);
const itemsPerPage = ref(10);
const totalUsers = ref(0)
const sort = ref({
  column: 'lastname',
  direction: 'asc'
});
const columns = [
  {
    accessorKey: 'accountActivated',
    header: 'Activé',
  },
  {
    accessorKey: 'fullName',
    header: 'Nom',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'actions',
    header: ''
  }
]

async function loadItem() {
  isLoading.value = true
  const { retrieved, error } = await clubQuery.get(itemId)
  isLoading.value = false

  if (!retrieved || error) {
    toast.add({
      color: "error",
      title: "Club non trouvé",
    })

    navigateTo('/super-admin/clubs')
    return
  }

  club.value = retrieved
  await loadClubSettings()
}

async function loadClubSettings() {
  if (!club.value) return

  if (club.value.settings?.uuid) {
    const clubSettingQuery = new ClubSettingQuery()
    clubSettingQuery.clubPath = club.value["@id"] // We define the club path since we are a super admin

    const { retrieved: clubSettings } = await clubSettingQuery.get(club.value.settings.uuid)
    if (clubSettings) {
      club.value.settings = clubSettings

      // We load the club logo
      const image = await loadClubLogo()
      if (image) {
        club.value.settings.logoBase64 = image
      }
    }
  }
}

async function loadClubLogo() {
  if (!club.value?.settings.logo?.publicUrl) return null;
  const fileQuery = new FileQuery();
  const { retrieved } = await fileQuery.getFromUrl(club.value.settings.logo.publicUrl);

  if (!retrieved || !retrieved.base64) return null

  return retrieved.base64
}

async function deleteClub() {
  if (!club.value) {
    return
  }

  const { error } = await clubQuery.delete(club.value)

  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    })

    return
  }
  navigateTo('/super-admin/clubs')
}

async function loadClubUsers() {
  isUsersLoading.value = true

  const urlParams = new URLSearchParams({
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  });

  urlParams.append(`order[accountActivated]`, 'DESC');
  urlParams.append(`order[${sort.value.column}]`, sort.value.direction);
  urlParams.append(`memberships.member.club.uuid`, itemId);

  const {totalItems, items} = await userQuery.getAll(urlParams)
  userClubs.value = items
  if (totalItems) {
    totalUsers.value = totalItems
  }

  isUsersLoading.value = false
}

// Main code
loadItem()
loadClubUsers()
</script>

<template>
  <div v-if="club" class="flex flex-col gap-4">
    <div class="flex flex-col lg:flex-row gap-2">
      <UButton
        to="/super-admin/clubs"
        icon="i-heroicons-queue-list"
        variant="soft"
        size="xs"
        label="Liste"
      />

      <div class="flex-1 text-center font-bold text-2xl flex justify-center items-center gap-2 ">
        <p>{{ club.name }}</p>
        <UIcon
          :class="club.isActivated ? 'text-success-600' : 'text-error-600'"
          :name="club.isActivated ? 'i-heroicons-check': 'i-heroicons-x-mark'"
        />
      </div>

      <div class="flex justify-between gap-2">
        <UButton
          icon="i-heroicons-pencil"
          color="warning"
          size="xs"
          label="Modifier"
          @click="itemModalOpen = true"
        />

        <UButton
          icon="i-heroicons-trash"
          color="error"
          size="xs"
          label="Supprimer"
          @click="
            overlayDeleteConfirmation.open({
              async onDelete() {
                await deleteClub()
                overlayDeleteConfirmation.close(true)
              }
            })
          "
        />
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard class="h-full">
          <div class="flex flex-col gap-4 relative">

            <div class="h-24 w-24 aspect-square self-center">
              <UAvatar
                class="w-full h-full"
                size="3xl"
                :src="club.settings.logoBase64"
                :alt="club.name"
                :ui="{
                    rounded: 'object-contain bg-gray-100 dark:bg-gray-800'
                  }"
              />
            </div>

            <div class="text-center text-2xl font-bold">
              {{ club.name }}
            </div>

            <div class="text-center text-lg flex flex-row justify-center align-middle gap-2">
              <p>Renouvellement le</p>
              <UButton
                  icon="i-heroicons-calendar-days-20-solid"
                  size="xs"
                  :color="dayjs().isAfter(dayjs(club.renewDate).subtract(14, 'days')) ? 'error' : 'primary'"
                  :label="formatDateReadable(club.renewDate?.toString()) || 'Choisir une date'"
                  @click="overlay.create(ModalClubSelectRenewDate).open({
                         item: club,
                         async onSelected(date: Date|undefined) {
                           if (!club) {
                             return
                           }
                           await clubQuery.patch(club, { renewDate: date ?? null })
                           await loadItem()
                         }
                       })"
              />
            </div>

            <div class="text-center text-lg flex flex-row justify-center align-middle gap-2">
              <p>Suppression programmée le</p>
              <UButton
                  icon="i-heroicons-calendar-days-20-solid"
                  size="xs"
                  :color="club.deletionDate ? 'error' : 'primary'"
                  :label="formatDateReadable(club.deletionDate?.toString()) || 'Choisir une date'"
                  @click="overlay.create(ModalClubSelectDeletionDate).open({
                         item: club,
                         async onSelected(date: Date|undefined) {
                           if (!club) {
                             return
                          }
                          await clubQuery.patch(club, { deletionDate: date ?? null })
                          await loadItem()
                        }
                      })"
              />
            </div>

            <div class="flex flex-col justify-center">
              <div v-if="club.website" class="flex justify-center items-center">
                <UIcon class="mr-2" name="i-heroicons-link" />
                <UButton variant="link" :to="club.website" target="_blank">{{ club.website }}</UButton>
              </div>

              <div v-if="club.contactName" class="flex justify-center items-center">
                <UIcon class="mr-2" name="i-heroicons-user" />
                <UButton variant="link">{{ club.contactName }}</UButton>
              </div>

              <div v-if="club.contactEmail" class="flex justify-center items-center">
                <UIcon class="mr-2" name="i-heroicons-at-symbol" />
                <UButton variant="link" :to="'mailto:' + club.contactEmail">{{ club.contactEmail }}</UButton>
              </div>

              <div v-if="club.contactPhone" class="flex justify-center items-center">
                <UIcon class="mr-2" name="i-heroicons-phone" />
                <UButton variant="link" :to="'tel:' + club.contactPhone">{{ club.contactPhone.match(/.{1,2}/g)?.join(' ') }}</UButton>
              </div>

              <div class="flex justify-center mt-4">
                <UButton color="warning" @click="selfStore.impersonateClub(club)">Impersonifier</UButton>
              </div>

            </div>

          </div>

      </UCard>

      <UCard
        class="flex-1"
        :ui="{
          body: {
            padding: 'h-full'
          }
        }"
      >
        <ClubSubscriptionList :item="club" />
      </UCard>

      <GenericCard title="Facturation">
        <div>
          <p>{{ club.name }}</p>
          <p>{{ club.address }}</p>
          <p>{{ club.zipCode }} {{ club.city }}</p>
          <p v-if="club.siret">Siret : {{ club.siret }}</p>
          <p v-if="club.vat">TVA : {{ club.vat }}</p>
        </div>
      </GenericCard>

      <GenericCard v-if="club.comment" title="Commentaire">
        <div class="whitespace-pre-line">
          {{ club.comment }}
        </div>
      </GenericCard>
    </div>

    <div>
      <GenericCard title="Utilisateurs">
        <p>Compte avec un mail de connexion liée.</p>
        <div>
          <UTable
            class="w-full"
            :loading="isUsersLoading"
            :columns="columns"
            :data="userClubs">
            <template #empty>
              <div class="flex flex-col items-center justify-center py-6 gap-3">
                <span class="italic text-sm">Aucun utilisateurs.</span>
              </div>
            </template>

            <template #accountActivated-cell="{ row }">
              <USwitch :model-value="row.original.accountActivated" />
            </template>

            <template #actions-cell="{ row }">
              <div class="text-right">
                <UButton variant="soft" :to="`/super-admin/users/${convertUuidToUrlUuid(row.original.uuid)}`">Détails</UButton>
              </div>
            </template>

          </UTable>

          <GenericTablePagination
            v-model:page="page"
            v-model:items-per-page="itemsPerPage"
            :total-items="totalUsers"
            @paginate="(object: TablePaginateInterface) => { loadClubUsers() }"
          />
        </div>
      </GenericCard>
    </div>
  </div>

  <UModal
    v-model:open="itemModalOpen">
    <template #content>
      <div>
        <UCard>
          <ClubForm
            :item="club ? {...club} : undefined"
            @updated="(value) => {itemModalOpen = false; loadItem() }"
          />
        </UCard>
      </div>
    </template>
  </UModal>
</template>

<style scoped lang="css">

</style>
