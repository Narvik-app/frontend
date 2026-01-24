<script setup lang="ts">

import SearchMember from "~/components/Member/SearchMember";
import RegisterMemberPresence from "~/components/PresentMember/RegisterMemberPresence";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {Member} from "~/types/api/item/clubDependent/member";
import RegisterExternalPresence from "~/components/ExternalPresence/RegisterExternalPresence";
import {useExternalPresenceStore} from "~/stores/useExternalPresence";
import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import {useSelfUserStore} from "~/stores/useSelfUser";
import type {TableRow} from "#ui/types";

const memberPresenceQuery = new MemberPresenceQuery();

const externalPresenceStore = useExternalPresenceStore()
const presentMembers: Ref<MemberPresence[] | undefined> = ref(undefined);
const isRefreshing: Ref<boolean> = ref(false)

const selfStore = useSelfUserStore();
const isSupervisor = selfStore.hasSupervisorRole()
let refreshInterval: NodeJS.Timeout

getPresences()

const presenceList = computed(() => {
  const response = {
    loading: true,
    presentMembers: Array.of<MemberPresence>()
  }

  if (presentMembers.value) {
    response.loading = false
    response.presentMembers = presentMembers.value
  }
  return response
});

const memberPresenceModalOpen = ref(false);
const searchMemberModalOpen = ref(false);
const addExternalPresenceModal = ref(false);
const historyModal = ref(false);

const searchQuery = ref('')

const selectedMemberPresence: Ref<MemberPresence | null> = ref(null)
const selectedMember: Ref<Member | null> = ref(null)

refreshNight()
function refreshNight() {
  const now = new Date();
  const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      3, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();
  if (msToMidnight > 0) {
    setTimeout(function() {
      getPresences(true);
      refreshNight(); // Then, reset again next night.
    }, msToMidnight);
  }
}

async function getPresences(force: boolean = false) {
  isRefreshing.value = true
  if (externalPresenceStore.list === undefined || force) {
    externalPresenceStore.refresh()
  }

  const {error, items} = await memberPresenceQuery.getPresentToday();
  isRefreshing.value = false
  if (items && !error) {
    presentMembers.value = items
  }
}

function rowClicked(row: TableRow<MemberPresence>) {
  selectedMemberPresence.value = row.original;
  memberPresenceModalOpen.value = true;
}

function openAddPresenceModal() {
  searchMemberModalOpen.value = true;
}

function openAddExternalPresenceModal() {
  addExternalPresenceModal.value = true
}

watch(searchMemberModalOpen, (value, oldValue) => {
  if (!value) {
    selectedMember.value = null;
    searchQuery.value = '';
  }
})

function memberSelectedFromSearch(member: Member) {

  // We check the member is not already present, in that case we open up the presence card
  const foundMember = presenceList.value.presentMembers.find( (pm) => pm.member.licence === member.licence);
  if (foundMember) {
    searchMemberModalOpen.value = false;

    selectedMemberPresence.value = foundMember;
    memberPresenceModalOpen.value = true;
    return;
  }

  // Presence not already registered, we display the registerMemberPresence form
  selectedMember.value = member;
}

function presenceRegistered(memberPresence: MemberPresence) {
  getPresences(true)
  searchMemberModalOpen.value = false;
  presentMembers.value = undefined; // We unset the list since we are refreshing it
}

function externalPresenceRegistered(memberPresence: ExternalPresence) {
  getPresences(true)
  addExternalPresenceModal.value = false;
}


function memberPresenceUpdated(memberPresence?: MemberPresence) {
  if (!memberPresence) memberPresenceModalOpen.value = false
  getPresences(true)
}

function keyPressHandler(ev: KeyboardEvent) {
  if (
      externalPresenceStore.modalOpen === true ||
      addExternalPresenceModal.value === true ||
      memberPresenceModalOpen.value === true ||
      searchMemberModalOpen.value === true ||
      historyModal.value === true) {
    return;
  }

  openAddPresenceModal()
  // Fix for chrome duplicating text but shouldn't
  if (navigator.userAgent.match(/firefox|fxios/i)) {
    searchQuery.value = searchQuery.value + ev.key
  }
}

onMounted(() => {
  externalPresenceStore.modalOpen = false
  window.addEventListener('keypress', keyPressHandler)
  if (isSupervisor) {
    refreshInterval = setInterval(() => {
      getPresences(true)
    }, 30000)
  }
})

onUnmounted(() => {
  window.removeEventListener('keypress', keyPressHandler)
  externalPresenceStore.modalOpen = false
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

</script>

<template>
  <div class="-mt-4 -mb-2">
    <div class="flex flex-col sm:flex-row gap-4 pt-4 pb-2 mb-4 sm:sticky sm:top-16 z-40 backdrop-blur-sm">
      <UButton
        icon="i-heroicons-calendar-days"
        variant="ghost"
        @click="historyModal = true"
      />

      <span class="flex-1"/>

      <UButton variant="soft" color="warning" label="Enregistrement utilisateur externe" @click="openAddExternalPresenceModal()"/>
      <UButton label="S'enregistrer" @click="openAddPresenceModal()"/>
    </div>

    <div v-if="externalPresenceStore.list && externalPresenceStore.list.length > 0" class="mb-4">
      <ExternalPresenceTodayList />
    </div>

    <UCard>
      <div class="flex px-3 py-3.5 border-b border-gray-200 dark:border-gray-700 items-center">
        <p class="font-bold">Membres enregistrés aujourd'hui : {{ presenceList.presentMembers.length }}</p>


        <div class="flex-1"/>

        <div class="inline-flex">
          <UTooltip text="Rafraichir">
            <UButton
                icon="i-heroicons-arrow-path"
                color="neutral"
                variant="outline"
                aria-label="Rafraichir"
                :loading="isRefreshing"
                @click="getPresences(true)"
            />
          </UTooltip>
        </div>
      </div>

      <PresenceTable
        :presences="presenceList.presentMembers"
        :total-presences="presenceList.presentMembers.length"
        :display-no-data-register="true"
        :display-full-date="false"
        :has-pagination="false"
        :is-loading="presenceList.loading || isRefreshing"
        @register="openAddPresenceModal()"
        @row-clicked="rowClicked"
      />

    </UCard>


    <UModal
        v-model:open="addExternalPresenceModal">
      <template #content>
        <div>
          <RegisterExternalPresence @registered="externalPresenceRegistered" @canceled="addExternalPresenceModal = false" />
        </div>
      </template>
    </UModal>

    <UModal
        v-model:open="memberPresenceModalOpen"
        :ui="{
           content: 'bg-transparent dark:bg-transparent shadow-none ring-transparent'
        }"
    >
      <template #content>
        <div>
          <PresentMemberDetails
            v-if="selectedMemberPresence"
            :item="selectedMemberPresence"
            @updated="memberPresenceUpdated"
            @close="memberPresenceModalOpen = false; selectedMemberPresence = null"
          />
        </div>
      </template>
    </UModal>

    <UModal
        v-model:open="searchMemberModalOpen">
      <template #content>
        <div>
          <template v-if="!selectedMember">
            <SearchMember :query="searchQuery" @selected-member="memberSelectedFromSearch" />
          </template>
          <template v-else>
            <RegisterMemberPresence :member="selectedMember" @registered="presenceRegistered" @canceled="searchMemberModalOpen = false;" />
          </template>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="historyModal"
      :ui="{
        content: 'lg:max-w-5xl p-4 mx-4'
      }"
    >
      <template #content>
        <div>
          <PresenceList />
        </div>
      </template>
    </UModal>

  </div>
</template>

<style scoped lang="css">

</style>
