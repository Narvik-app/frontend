<script setup lang="ts">
import type {PropType} from "vue";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import clipboard from "clipboardy";
import RegisterMemberPresence from "~/components/PresentMember/RegisterMemberPresence.vue";
import type {ExposedFile} from "~/types/api/item/exposedFile";
import FileQuery from "~/composables/api/query/FileQuery";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import type {Member} from "~/types/api/item/clubDependent/member";
import {formatDateReadable} from "~/utils/date";
import {useSelfUserStore} from "~/stores/useSelfUser";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {convertUuidToUrlUuid} from "~/utils/resource";

const toast = useToast()
const selfStore = useSelfUserStore()
const _isAdmin = selfStore.isAdmin()
const isSupervisor = selfStore.hasSupervisorRole()
const isBadger = selfStore.isBadger()

const props = defineProps({
  item: {
    type: Object as PropType<MemberPresence>,
    required: true
  },
  viewOnly: {
    type: Boolean,
    required: false,
    default: false
  }
});

const emit = defineEmits([
  'updated',
  'close'
])

const fileQuery = new FileQuery()
const memberQuery = new MemberQuery()
const memberPresenceQuery = new MemberPresenceQuery()

const popoverOpen = ref(false)

const memberPresence: Ref<MemberPresence> = ref(props.item)
const member: Ref<Member | undefined> = ref(undefined)

const memberProfileImage: Ref<ExposedFile|undefined> = ref(undefined)

const isLoadingPresences = ref(false)
const memberPresences: Ref<MemberPresence[]> = ref([])
const totalMemberPresences = computed(() => memberPresences.value.length)

const chartData: Ref<ChartDoughnutData|undefined> = ref(undefined)

const updateMemberPresenceModalOpen = ref(false);

if (memberPresence.value && memberPresence.value.member?.uuid) {
  // We request the real member datas
  memberQuery.get(memberPresence.value.member.uuid).then(memberResponse => {
    if (memberResponse.retrieved) {
      member.value = memberResponse.retrieved

      // We load the profile image
      if (memberResponse.retrieved.profileImage?.privateUrl) {
        fileQuery.getFromUrl(memberResponse.retrieved.profileImage.privateUrl).then(profileImage => {
          if (profileImage.retrieved) {
            memberProfileImage.value = profileImage.retrieved
          }
        })
      }
    }
  })
}

function loadPresenceHistory() {
  if (!member.value || !member.value.uuid) return;

  // We load the member stats
  const presenceUrlParams = new URLSearchParams({
    'order[date]': 'desc',
    'date[after]': new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10)
  });

  isLoadingPresences.value = true
  memberQuery.presences(member.value.uuid, presenceUrlParams).then(presencesResponse => {
    isLoadingPresences.value = false
    if (presencesResponse.items.length > 0) {
      memberPresences.value = presencesResponse.items

      // We update the chart
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define chart data type properly
      const data: any = []

      const newChartData = {
        labels: [] as string[],
        datasets: [
          {
            data: [] as string[]
          },
        ],
      }

      presencesResponse.items.forEach(pr => {
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
  })
}

function presenceUpdated(newMemberPresence: MemberPresence) {
  updateMemberPresenceModalOpen.value = false;
  memberPresence.value = newMemberPresence
  emit('updated', newMemberPresence)
}

async function deletePresence() {
  if (isSupervisor || isBadger) {
    await memberPresenceQuery.delete(memberPresence.value)
    popoverOpen.value = false
    emit('updated', null)
  }
}

async function copyLicence() {
  if (selfStore.hasSupervisorRole() && props.item.member?.licence) {
    clipboard.write(props.item.member.licence)
    toast.add({
      title: 'Licence copiée'
    })
  }
}

</script>

<template>
  <div>
    <template v-if="member">
      <UCard class="bg-(--ui-bg)">
        <div class="flex gap-2 mb-2">
          <UButton
            icon="i-heroicons-x-circle"
            color="neutral"
            variant="outline"
            size="xs"
            @click="emit('close')"
          />

          <div class="flex-1"/>

          <template v-if="!viewOnly && (isSupervisor || isBadger)">
            <UButton
              icon="i-heroicons-pencil-square"
              size="xs"
              variant="soft"
              label="Éditer la présence"
              @click="updateMemberPresenceModalOpen = true"
            />
            <UTooltip v-if="!member.blacklisted || (isSupervisor)" text="Supprimer la présence">
              <UPopover v-model:open="popoverOpen">
                <UButton
                  icon="i-heroicons-trash"
                  size="xs"
                  color="error"
                  variant="ghost"
                />

                <template #content>
                  <div class="p-4 w-56 flex flex-col gap-4">
                    <div class="text-center text-lg font-bold">Êtes-vous certain ?</div>

                    <UButton
                      color="error"
                      class="mx-auto"
                      @click="deletePresence();"
                    >
                      Supprimer
                    </UButton>
                  </div>
                </template>
              </UPopover>
            </UTooltip>
          </template>
        </div>

        <div class="mx-auto my-0 h-24 w-24 aspect-square">
          <UAvatar
            class="w-full h-full"
            size="3xl"
            :src="memberProfileImage?.base64"
            :alt="member.fullName"
            :ui="{
              rounded: 'object-contain bg-gray-100 dark:bg-gray-800'
            }"
          />
        </div>

        <div class="space-y-4 w-full my-4">
          <div class="text-center text-2xl font-bold">
            <ContentLink v-if="isSupervisor" class="!text-(--ui-text)" :to="`/admin/members/${convertUuidToUrlUuid(member.uuid)}`">
              {{ member.fullName }}
            </ContentLink>

            <template v-else>
              {{ member.fullName }}
            </template>
          </div>
          <div class="flex justify-center flex-wrap gap-2">
            <UBadge
                v-if="member.currentSeason && member.currentSeason.ageCategory"
                variant="subtle"
                color="warning">
              {{ member.currentSeason.ageCategory.name }}
            </UBadge>

            <div v-if="member.blacklisted" class="basis-full text-center">
              <UButton
                color="neutral">
                Blacklisté
              </UButton>
            </div>

            <div v-if="member.medicalCertificateExpiration && member.medicalCertificateStatus !== 'valid'" class="basis-full text-center">
              <UButton
                :color="member.medicalCertificateStatus === 'expired' ? 'error' : 'warning'">
                Certificat médical : {{ formatDateReadable(member.medicalCertificateExpiration.toString()) }}
              </UButton>
            </div>

            <UButton
              v-if="!member.currentSeason"
              color="error">
              Saison non renouvelée
            </UButton>

            <UBadge
v-if="member.currentSeason && member.currentSeason.isSecondaryClub"
                    variant="subtle"
                    color="success">
              Club secondaire
            </UBadge>
          </div>
          <div class="flex items-center justify-center text-xl cursor-pointer" @click="copyLicence">
            <UIcon class="mr-2" name="i-heroicons-identification" />
            {{ member.licence }}
          </div>
          <div v-if="member.lastControlShooting" class="text-center text-xl">
            Dernier contrôle : {{ formatDateReadable(member.lastControlShooting.toString()) }}
          </div>
          <div class="flex gap-4 justify-center flex-wrap">
            <UButton
                v-for="activity in memberPresence?.activities?.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))"
                :key="activity.uuid"
                variant="soft">
              {{ activity.name }}
            </UButton>
          </div>

        </div>

        <div class="flex justify-center">
          <UButton
            :loading="isLoadingPresences"
            @click="loadPresenceHistory()"
          >
            Afficher l'historique de présence
          </UButton>
        </div>
      </UCard>

      <UCard
          v-if="totalMemberPresences > 0"
          class="mt-4 bg-(--ui-bg)"
      >
        <div class="text-xl text-center font-bold mb-4">{{ totalMemberPresences }} présences ces 12 derniers mois</div>

        <div v-if="chartData" class="h-96 mt-4">
          <ChartDoughnut :data="chartData" />
        </div>
      </UCard>

    </template>

    <UCard v-else>
      <div class="flex justify-end">
        <UTooltip text="Editer" class="">
          <UButton
              icon="i-heroicons-pencil-square"
              size="xs"
              variant="ghost"
          />
        </UTooltip>
      </div>

      <div class="mx-auto my-0 h-24 w-24 aspect-square">
        <USkeleton class="w-full h-full" />
      </div>

      <div class="space-y-4 w-full mt-4">
        <div v-for="(w, wIndex) in ['w-52 h-8', 'w-36 h-4', 'w-48 h-4']" :key="wIndex" class="flex justify-center">
          <USkeleton :class="w" />
        </div>
        <div class="flex gap-4 justify-center flex-wrap">
          <USkeleton v-for="j in (Math.floor(Math.random()*6) + 2)" :key="j" class="w-14 h-4" />
        </div>

      </div>
    </UCard>

    <UModal
        v-model:open="updateMemberPresenceModalOpen">
      <template #content>
        <div>
          <RegisterMemberPresence
            :member-presence="memberPresence"
            @registered="presenceUpdated"
            @canceled="updateMemberPresenceModalOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>

</template>

<style scoped lang="css">

</style>
