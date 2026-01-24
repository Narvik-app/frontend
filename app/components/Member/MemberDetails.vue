<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import type {ExposedFile} from "~/types/api/item/exposedFile";
import FileQuery from "~/composables/api/query/FileQuery";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {formatDate, formatDateReadable} from "~/utils/date"
import {useSelfUserStore} from "~/stores/useSelfUser";
import RegisterMemberPresence from "~/components/PresentMember/RegisterMemberPresence.vue";
import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {MemberSeason, MemberSeasonWrite} from "~/types/api/item/clubDependent/memberSeason";
import {ClubRole, getAvailableClubRoles} from "~/types/api/item/club";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import MemberSeasonQuery from "~/composables/api/query/clubDependent/MemberSeasonQuery";
import MemberSeasonSelectModal from "~/components/MemberSeason/MemberSeasonSelectModal.vue";
import MemberEditLinkedEmailModal from "~/components/Member/MemberEditLinkedEmailModal.vue";
import clipboard from "clipboardy";
import type {TablePaginateInterface} from "~/types/table";
import type {SelectApiItem} from "~/types/select";
import {createBrowserCsvDownload} from "~/utils/browser";
import type {ColumnSort} from "@tanstack/table-core";
import {getTableSortVal} from "~/utils/table";
import {Permission} from "~/types/api/permissions";


const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: false
  },
  memberId: {
    type: String,
    required: false
  },
  self: {
    type: Boolean,
    default: false
  }
});

// Default var setting

const toast = useToast()
const overlay = useOverlay()

const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

const selfStore = useSelfUserStore();

const loggedUsername = selfStore.member?.email
const isSuperAdmin = selfStore.isSuperAdmin();
const isAdmin = selfStore.isAdmin();
const isSupervisor = selfStore.hasSupervisorRole();
const canSendEmail = selfStore.can(Permission.EmailEdit)

const addMemberPresenceModal = ref(false)
const selectedPresence: Ref<MemberPresence | undefined> = ref(undefined)
const memberPresenceModal: Ref<boolean> = ref(false);

const member: Ref<Member | undefined> = ref(undefined)
const memberProfileImage: Ref<ExposedFile | undefined> = ref(undefined)
const memberPresences: Ref<MemberPresence[]> = ref([])
const totalMemberPresences = computed(() => memberPresences.value.length)

const isLoadingMemberSeasons = ref(false)
const memberSeasons: Ref<MemberSeason[]> = ref([])

const isLoadingMemberPresencesPaginated = ref(false)
const memberPresencesPaginated: Ref<MemberPresence[]> = ref([])
const totalMemberPresencesPaginated = ref(0)

const isDownloadingCsv = ref(false)
const itemModalOpen = ref(false)
const changeMemberRoleModalOpen = ref(false)


const chartData: Ref<ChartDoughnutData|undefined> = ref(undefined)

// Season table
const seasonPage = ref(1)
const seasonItemsPerPage = ref(5);
const memberSeasonRows = computed(() => {
  return memberSeasons.value.slice((seasonPage.value - 1) * seasonItemsPerPage.value, (seasonPage.value) * seasonItemsPerPage.value)
})

// Presences table
const isUpdating = ref(false);
const page = ref(1);
const itemsPerPage = ref(10);
const sort = ref([{
  id: 'date',
  desc: true,

}] as ColumnSort[]);

const memberQuery = new MemberQuery();
let memberSeasonQuery: MemberSeasonQuery|null = null

const memberPresenceQuery = new MemberPresenceQuery();
const fileQuery = new FileQuery();

const activityQuery = new ActivityQuery()
const selectedActivities: Ref<SelectApiItem<Activity>[]> = ref([])
const activities: Ref<Activity[]> = ref([])
activityQuery.getAll().then(value => {
  activities.value = value.items.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
});
const activitiesSelect = computed( () => {
  const items: SelectApiItem<Activity>[] = []
  activities.value.forEach(value => {
    items.push({
      label: value.name,
      value: value.uuid,
      item: value
    })
  })
  return items;
})

watch(selectedActivities, (newValue) => {
  getMemberPresencesPaginated()
})

const selectedNewRole: Ref<string | undefined> = ref(undefined);
const availableRoles = getAvailableClubRoles()
const rolesSelect = computed( () => {
  const items: SelectApiItem[] = []
  availableRoles.forEach(value => {
    items.push({
      label: value.text,
      value: value.value
    })
  })
  return items;
})

watch(member, (newValue, oldValue) => {
  if (newValue) {
    if (member.value) {
      memberSeasonQuery = new MemberSeasonQuery(member.value)

      if (member.value.profileImage?.privateUrl) {
        fileQuery.getFromUrl(member.value.profileImage.privateUrl).then(imageResponse => {
          memberProfileImage.value = imageResponse.retrieved
        })
      }

      selectedNewRole.value = member.value.role

      // We get the presences
      getMemberPresences()
    }
  }
})

// Main logic
loadItem()

function loadItem() {
  if (props.member) {
    member.value = props.member
  } else {
    if (!props.memberId) {
      throw new Error("memberId prop should be defined")
    }

    memberQuery.get(props.memberId).then(value => {
      if (value.error) {
        toast.add({
          color: "error",
          title: "Une erreur s'est produite",
          description: value.error.message || value.error.toString()
        })

        navigateTo('/admin/members')
        return;
      }

      if (value.retrieved) {
        member.value = value.retrieved
      }
    });
  }
}

function changeMemberRole() {
  if (!isAdmin || !member.value || !selectedNewRole.value) return;

  memberQuery.updateRole(member.value, selectedNewRole.value as ClubRole).then(({updated, error}) => {
    if (error) {
      toast.add({
        color: "error",
        title: "Une erreur est survenue",
        description: error.message
      })
      return;
    }

    toast.add({
      color: "success",
      title: "Rôle modifié"
    })

    if (member.value && updated) {
      member.value.role = updated.role
    }

    changeMemberRoleModalOpen.value = false
  });
}

async function getMemberSeasons() {
  if (!member.value || !member.value.uuid) return;
  isLoadingMemberSeasons.value = true
  const { error, items } = await memberQuery.seasons(member.value.uuid)
  isLoadingMemberSeasons.value = false
  if (error) {
    return
  }
  memberSeasons.value = items
}

async function getMemberPresences() {
  if (!member.value || !member.value.uuid) return;

  await getMemberSeasons()

  const presenceUrlParams = new URLSearchParams({
    'order[date]': 'desc',
    'date[after]': new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10)
  });

  const { totalItems, items } = await memberQuery.presences(member.value.uuid, presenceUrlParams)
  if (totalItems && totalItems > 0) {
    memberPresences.value = items

    // We update the chart
    const data: any = []

    const newChartData = {
      labels: [] as string[],
      datasets: [
        {
          data: [] as string[]
        },
      ],
    }

    items.forEach(pr => {
      pr.activities?.forEach(actvt => {
        if (data[actvt.name]) {
          data[actvt.name] = data[actvt.name] + 1;
        }  else {
          data[actvt.name] = 1;
        }
      })
    });


    newChartData.labels = Object.keys(data)
    newChartData.datasets[0].data = Object.values(data)
    chartData.value = newChartData
  }

  await getMemberPresencesPaginated()
}

async function getMemberPresencesPaginated() {
  if (!member.value || !member.value.uuid) return;
  isLoadingMemberPresencesPaginated.value = true

  const urlParams = new URLSearchParams({
    pagination: '1',
    page: page.value.toString(),
    itemsPerPage: itemsPerPage.value.toString(),
  });

  if (sort.value.length > 0) {
    sort.value.forEach((value) => {
      urlParams.append(`order[${value.id}]`, getTableSortVal(value))
    })
  }

  if (selectedActivities.value.length > 0) {
    selectedActivities.value.forEach(filteredActivity => {
      if (!filteredActivity.value) return;
      urlParams.append('activities.uuid[]', filteredActivity.value)
    })
  }

  // We make the search
  const { totalItems, items } = await memberQuery.presences(member.value.uuid, urlParams)
  memberPresencesPaginated.value = items
  if (totalItems) {
    totalMemberPresencesPaginated.value = totalItems
  }

  isLoadingMemberPresencesPaginated.value = false
}

async function deleteRow(memberPresence: MemberPresence) {
  isUpdating.value = true

  const { error } = await memberPresenceQuery.delete(memberPresence)

  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    })
    isUpdating.value = false
    return;
  }

  // We remove the presence from the array
  await getMemberPresences();

  toast.add({
    color: "success",
    title: "Présence supprimée"
  })

  isUpdating.value = false
}

function presenceUpdated(presence?: MemberPresence) {
  memberPresenceModal.value = false
  getMemberPresences()
}

async function downloadCsv() {
  if (!member.value || !member.value.uuid) return;
  isDownloadingCsv.value = true

  const urlParams = new URLSearchParams({
    pagination: 'false',
  });

  if (sort.value.length > 0) {
    sort.value.forEach((value) => {
      urlParams.append(`order[${value.id}]`, getTableSortVal(value))
    })
  }

  if (selectedActivities.value.length > 0) {
    selectedActivities.value.forEach(filteredActivity => {
      if (!filteredActivity.value) return;
      urlParams.append('activities.uuid[]', filteredActivity.value)
    })
  }

  // We make the search
  const { data } = await memberQuery.presencesCsv(member.value.uuid, urlParams)
  isDownloadingCsv.value = false
  // We download in the browser
  const filename = `${member.value.licence}-presences.csv`
  createBrowserCsvDownload(filename, data)
}

async function addMemberSeason(seasonIri: string, isSecondary: boolean = false, ageCategory: string|undefined = undefined) {
  if (!memberSeasonQuery || !member.value) {
    return
  }

  const memberSeason: MemberSeasonWrite = {
    member: member.value["@id"],
    season: seasonIri,
    isSecondaryClub: isSecondary
  }

  if (ageCategory) {
    memberSeason.ageCategory = ageCategory
  }

  memberSeasonQuery.post(memberSeason).then(async ({error}) => {
    if (error) {
      toast.add({
        color: "error",
        title: "L'ajout a échoué",
        description: error.message
      })
      return;
    }

    loadItem()

    toast.add({
      color: "success",
      title: "Saison ajoutée"
    })
  })
}

async function deleteMemberSeason(memberSeason: MemberSeason) {
  if (!memberSeasonQuery) {
    return
  }

  const { error } = await memberSeasonQuery.delete(memberSeason)
  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    })
    return;
  }

  await getMemberSeasons()

  toast.add({
    color: "success",
    title: "Saison supprimée"
  })
}

async function deleteMember() {
  if (!member.value) return

  const { error } = await memberQuery.delete(member.value)

  if (error) {
    toast.add({
      color: "error",
      title: "La suppression a échouée",
      description: error.message
    })
    isUpdating.value = false
    return;
  }

  toast.add({
    color: "success",
    title: "Membre supprimé"
  })
  navigateTo('/admin/members')
}
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:flex-wrap gap-4">
    <div class="flex-1 flex flex-col lg:flex-row gap-2">
      <UTooltip v-if="isSupervisor" text="Liste des membres" class="">
        <UButton
          to="/admin/members"
          icon="i-heroicons-queue-list"
          size="xs"
          variant="ghost"
        />
      </UTooltip>

      <!-- Admin && not current account -->
      <template v-if="member">
        <UModal
v-if="isSuperAdmin || (isAdmin && member.email != loggedUsername)"
          v-model:open="changeMemberRoleModalOpen"
        >
          <UButton>
            Modifier les permissions
          </UButton>

          <template #content>
            <div>
              <UCard>
                <div class="flex flex-col gap-4">
                  <div class="text-center text-lg font-bold">Nouveau rôle souhaité</div>

                  <USelect
                    v-model="selectedNewRole"
                    :items="rolesSelect"
                    placeholder="Aucun rôle de défini" />

                  <UButton
                    class="mx-auto"
                    @click="changeMemberRole()"
                  >
                    Modifier
                  </UButton>
                </div>
              </UCard>
            </div>
          </template>

        </UModal>

        <div class="flex-1"/>

        <div>
          <UButton
            v-if="isAdmin"
            icon="i-heroicons-pencil-square"
            @click="overlay.create(MemberEditLinkedEmailModal).open({
              member: member,
              onUpdated() {
                loadItem()
              }
            })"
          >
            <template v-if="member.linkedEmail">
              Changer le compte lié
            </template>
            <template v-else>
              Lier à un compte existant
            </template>
          </UButton>
        </div>

        <div class="flex justify-between lg:justify-end gap-2">
          <UButton
            v-if="isAdmin"
            icon="i-heroicons-pencil-square"
            @click="itemModalOpen = true"
          >
            Modifier
          </UButton>

          <UButton
            v-if="member.uuid && (isSuperAdmin || (isAdmin && member.email != loggedUsername))"
            icon="i-heroicons-trash"
            color="error"
            @click="
              overlayDeleteConfirmation.open({
                alertDescription: 'Les historiques de présences seront anonymisés et ne pourront être rétablie auprès de ce membre.',
                alertColor: 'error',
                async onDelete() {
                  await deleteMember()
                  overlayDeleteConfirmation.close(true)
                }
              })"
          >
            Supprimer
          </UButton>
        </div>
      </template>

    </div>
    <div class="grid grid-cols-1 lg:grid-cols-9 gap-4 w-full">

      <div class="lg:col-span-5">
        <UCard v-if="!member">
          <div class="mx-auto my-0 h-24 w-24 aspect-square">
            <USkeleton class="w-full h-full"/>
          </div>

          <div class="space-y-4 w-full mt-4">
            <div v-for="w in ['w-52 h-8', 'w-36 h-4', 'w-48 h-4']" class="flex justify-center">
              <USkeleton :class="w" />
            </div>
            <div class="flex gap-4 justify-center flex-wrap">
              <USkeleton v-for="i in (Math.floor(Math.random()*6) + 2)" class="w-14 h-4" />
            </div>

          </div>
        </UCard>

        <UCard v-else class="h-full">
          <div class="flex flex-col gap-4 relative">
            <div class="flex justify-end gap-2">
              <UButton
                v-if="member.uuid && canSendEmail"
                variant="soft"
                icon="i-heroicons-envelope"
                :to="`/admin/email/new?members=${convertUuidToUrlUuid(member.uuid)}`"
              />
            </div>

            <div class="h-24 w-24 aspect-square self-center">
              <UAvatar
                class="w-full h-full"
                size="3xl"
                :src="memberProfileImage?.base64"
                :alt="member.fullName"
              />
            </div>

            <div class="text-center text-2xl font-bold">
              {{ member.fullName }}
            </div>

            <div class="flex flex-col items-center justify-center flex-wrap gap-1">
              <div v-if="member.blacklisted">
                <UButton
                  color="neutral">
                  Blacklisté
                </UButton>
              </div>

              <div v-if="!member.currentSeason">
                <UButton
                  color="error">
                  Saison non renouvelée
                </UButton>
              </div>

              <div v-if="member.medicalCertificateExpiration && member.medicalCertificateStatus !== 'valid'">
                <UButton
                  :color="member.medicalCertificateStatus === 'expired' ? 'error' : 'warning'">
                  Certificat médical : {{ formatDateReadable(member.medicalCertificateExpiration.toString()) }}
                </UButton>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 text-sm gap-2">
              <div v-if="member.lastControlShooting" class="xl:col-span-2 flex items-center">
                Dernier contrôle : {{ formatDateReadable(member.lastControlShooting.toString()) }}
              </div>

              <MemberDetailsPersonnalInfo icon="i-heroicons-identification" :label="member.licence" to="#" @click.prevent="clipboard.write(member.licence ?? '');toast.add({title: 'Licence copiée'});" />
              <MemberDetailsPersonnalInfo icon="i-heroicons-at-symbol" :label="member.email" :to="'mailto:' + member.email" />
              <MemberDetailsPersonnalInfo icon="i-heroicons-phone" :label="member.phone?.match(/.{1,2}/g)?.join(' ')" :to="member.phone ? 'tel:' + member.phone : undefined" />
              <MemberDetailsPersonnalInfo icon="i-heroicons-phone" :label="member.mobilePhone?.match(/.{1,2}/g)?.join(' ')" :to="member.mobilePhone ? 'tel:' + member.mobilePhone : undefined" />
              <MemberDetailsPersonnalInfo
                :as-link="true"
                icon="i-heroicons-newspaper"
                :classes="!member.clubNewsletter ? 'text-error-500 hover:text-error-500' : ''"
                :label="(member.clubNewsletter ? 'Accepte' : 'Refuse') + ' les newsletters'"
              />

              <USeparator label="Adresse" class="xl:col-span-2" />

              <div class="xl:col-span-2">
                <p>{{ member.postal1 }}</p>
                <p>{{ member.postal2 }}</p>
                <p>{{ member.postal3 }}</p>
                <p>{{ member.zipCode }} {{ member.city }}</p>
                <p>{{ member.country }}</p>
              </div>

            </div>

          </div>

        </UCard>
      </div>

      <div class="lg:col-span-4">
        <UCard>
          <div class="flex flex-col h-full">
            <div v-if="isSupervisor" class="flex gap-4">
              <div class="flex-1"/>
              <UButton
                @click="overlay.create(MemberSeasonSelectModal).open({
                  onSelected(seasonIri: string, isSecondary: boolean, ageCategory: string|undefined) {
                    addMemberSeason(seasonIri, isSecondary, ageCategory)
                  }
                })"
              >
                Ajouter une saison
              </UButton>
            </div>

            <UTable
              class="flex-1"
              :columns="[
                {
                  accessorKey: 'season.name',
                  header: 'Saison',
                  meta: {
                    class: {
                      th: 'w-full',
                    }
                  }
                },
                {
                  accessorKey: 'isSecondaryClub',
                  header: 'Club secondaire',
                },
                {
                  accessorKey: 'ageCategory.name',
                  header: 'Catégorie'
                },
                {
                  accessorKey: 'actions',
                  header: ''
                }
              ]"
              :loading="isLoadingMemberSeasons"
              :data="memberSeasonRows"
            >

              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">Aucune saisons enregistrée</span>
                </div>
              </template>

              <template #actions-cell="{ row }" >
                <div v-if="isSupervisor" class="flex gap-4">
                  <UButton
                    icon="i-heroicons-trash"
                    color="error"
                    @click="overlayDeleteConfirmation.open({
                      alertTitle: `Suppression de la saison ${row.original.season?.name} pour ${member?.fullName}`,
                      alertColor: 'error',
                      async onDelete() {
                        await deleteMemberSeason(row.original)
                        overlayDeleteConfirmation.close(true)
                      }
                    })"
                  />
                </div>
              </template>

              <template #isSecondaryClub-cell="{ row }">
                <USwitch :model-value="row.original.isSecondaryClub" />
              </template>
            </UTable>

            <div class="flex flex-wrap justify-end gap-4 px-3">
              <UPagination v-model:page="seasonPage" :items-per-page="parseInt(seasonItemsPerPage.toString())" :total="memberSeasons.length" />
            </div>

          </div>
        </UCard>
      </div>

      <div v-if="member?.role === ClubRole.Supervisor" class="lg:col-span-9">
        <MemberPermissions :member="member" @updated="loadItem" />
      </div>

      <div class="lg:col-span-9">
        <GenericCard v-if="totalMemberPresences > 0" :title="`${totalMemberPresences} présences ces 12 derniers mois`">
          <div class="h-96 mt-2">
            <ChartDoughnut :data="chartData"/>
          </div>
        </GenericCard>
        <GenericCard v-else>
          <i class="text-lg">Aucune présences ces 12 derniers mois</i>
        </GenericCard>
      </div>

      <div class="lg:col-span-9">
        <UCard>
          <div class="flex flex-col">
            <div v-if="isSupervisor" class="flex flex-col-reverse lg:flex-row gap-4">
              <USelectMenu
                v-model="selectedActivities"
                class="w-44"
                :items="activitiesSelect"
                multiple
              >
                <template #default>
                  <span v-if="selectedActivities.length" class="truncate">
                    {{ selectedActivities.map(fa => fa.label).join(', ') }}
                  </span>
                  <span v-else>Activités</span>
                </template>
              </USelectMenu>

              <div class="flex-1"/>
              <UButton @click="addMemberPresenceModal = true" >
                Ajouter une activité
              </UButton>

              <UButton icon="i-heroicons-arrow-down-tray" color="success" :loading="isDownloadingCsv" @click="downloadCsv()">
                CSV
              </UButton>
            </div>

            <UTable
              v-model:sorting="sort"
              :loading="isLoadingMemberPresencesPaginated"
              :columns="[
              {
                accessorKey: 'date',
                header: 'Date',
              },
              {
                accessorKey: 'activities',
                header: 'Activités',
                meta: {
                  class: {
                    th: 'w-full',
                  }
                }
              },
              {
                accessorKey: 'actions',
                header: ''
              }
            ]"
              :sorting-options="{
                manualSorting: true,
                enableMultiSort: false,
              }"
              :data="memberPresencesPaginated"
              @update:sorting="getMemberPresencesPaginated()"
            >

              <template #empty>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">Aucune présence enregistrée</span>
                </div>
              </template>

              <template #date-header="{ column }">
                <GenericTableSortButton :column="column" />
              </template>
              <template #date-cell="{ row }">
                {{ formatDate(row.original.date) }} à {{ formatTimeReadable(row.original.createdAt) }}
              </template>

              <template #activities-cell="{ row }">
                <div v-if="row.original.activities.length == 0">
                  <i>Aucune activités déclarées</i>
                </div>

                <div class="flex flex-1 flex-wrap gap-4">
                  <UButton
                    v-for="activity in row.original.activities.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))"
                    variant="soft">
                    {{ activity.name }}
                  </UButton>
                </div>
              </template>

              <template #actions-cell="{ row }" >
                <div v-if="isSupervisor" class="flex gap-4">
                  <UButton label="Modifier" @click="selectedPresence = row.original; memberPresenceModal = true;" />

                  <UButton
                    color="error"
                    label="Supprimer"
                    @click="overlayDeleteConfirmation.open({
                    title: `Présence du ${formatDateReadable(row.original.date)}`,
                    alertTitle: 'La suppression de la présence sera définitive.',
                    alertColor: 'error',
                    async onDelete() {
                      await deleteRow(row.original)
                      overlayDeleteConfirmation.close(true)
                    }
                  })"
                  />
                </div>
              </template>

            </UTable>

            <GenericTablePagination
              v-model:page="page"
              v-model:items-per-page="itemsPerPage"
              :total-items="totalMemberPresencesPaginated"
              @paginate="(object: TablePaginateInterface) => { getMemberPresencesPaginated() }"
            />
          </div>
        </UCard>
      </div>

      <UModal
        v-model:open="itemModalOpen">
        <template #content>
          <div>
            <UCard>
              <MemberForm
                :item="member ? {...member} : undefined"
                @updated="(value) => {itemModalOpen = false; loadItem() }"
              />
            </UCard>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="addMemberPresenceModal">
        <template #content>
          <div>
            <RegisterMemberPresence
              :member="member"
              :date-editable="true"
              @canceled="addMemberPresenceModal = false"
              @registered="addMemberPresenceModal = false; getMemberPresences()"
            />
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="memberPresenceModal">
        <template #content>
          <div>
            <RegisterMemberPresence
              :member-presence="selectedPresence"
              :date-editable="true"
              @canceled="memberPresenceModal = false"
              @registered="presenceUpdated"
            />
          </div>
        </template>
      </UModal>

    </div>
  </div>
</template>

<style scoped lang="css">

</style>
