<script setup lang="ts">
import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import FileQuery from "~/composables/api/query/FileQuery";
import {convertUuidToUrlUuid} from "~/utils/resource";
import {print} from "~/utils/browser";

definePageMeta({
    layout: "admin"
  });

  useHead({
    title: 'Trombinoscope'
  })

  const isLoading = ref(true);

  const page = ref(1);
  const itemsPerPage = ref(100);
  const sort = ref({
    column: 'lastname',
    direction: 'asc'
  });
  const totalMembers: Ref<number> = ref(0);

  const members: Ref<Member[]> = ref([]);

  const memberQuery = new MemberQuery();
  const fileQuery = new FileQuery();

  getMembers();

  async function getMembers() {
    isLoading.value = true;

    const urlParams = new URLSearchParams({
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString(),
      'exists[licence]': 'true',
    });

    urlParams.append(`order[${sort.value.column}]`, sort.value.direction);
    urlParams.append(`order[firstname]`, 'asc');
    urlParams.append('current-season[memberSeasons.season]', 'true');

    memberQuery.getAll(urlParams).then(async value => {
      if (value.items) {
        for (const member of value.items) {
          const img = await loadMemberProfileImage(member)
          if (img) {
            member.profileImageBase64 = img;
          }
        }

        members.value = members.value.concat(value.items)


        if (value.totalItems && totalMembers.value == 0) {
          totalMembers.value = value.totalItems
        }

        if (value.view && value.view["next"]) {
          page.value = page.value + 1;
          getMembers();
          return;
        }
        isLoading.value = false;
      }
    });
  }

  async function loadMemberProfileImage(member: Member) {
    if (!member.profileImage?.privateUrl) return null;

    const { retrieved } = await fileQuery.getFromUrl(member.profileImage.privateUrl);
    if (!retrieved || !retrieved.base64) return null

    return retrieved.base64
  }
</script>

<template>
  <div>
    <GenericCardWithActions class="print:ring-0 print:shadow-none print:!bg-transparent" :title="`Trombinoscope pour la saison actuelle (${totalMembers} membres)`">
      <template #actions>
        <UButton :disabled="isLoading" icon="i-heroicons-printer" @click="print()" />
      </template>

      <UProgress
        v-if="isLoading"
        class="mb-4"
        v-model="members.length"
        :max="totalMembers"
        status
      >
        <template #status="{percent}">
          <div class="text-right">
            <span class="text-xs">Liste chargée à {{ Math.round(percent ?? 0) || 0 }} %</span>
          </div>
        </template>
      </UProgress>

      <div class="grid grid-flow-row gap-4 grid-cols-1 sm:grid-cols-3 xl:grid-cols-5">
        <NuxtLink
          v-for="member in (members)"
          :to="`/admin/members/${convertUuidToUrlUuid(member.uuid)}`"
          target="_blank"
          class="transition ease-in-out hover:scale-105 duration-300 "
        >
          <UCard
            :ui="{
              background: 'bg-white dark:bg-slate-950'
            }"
          >
            <div class="h-24 w-24 aspect-square mx-auto">
              <UAvatar
                class="w-full h-full"
                size="3xl"
                :src="member?.profileImageBase64"
                :alt="member.fullName"
                :ui="{
                  rounded: 'object-contain bg-gray-100 dark:bg-gray-800'
                }"
              />
            </div>

            <div class="mt-4 mx-auto text-center">
              <p>{{ member.lastname }}</p>
              <p>{{ member.firstname }}</p>
            </div>

            <div class="mx-auto text-center mt-1">
              {{ member.licence }}
            </div>

          </UCard>

        </NuxtLink>

        <template v-if="isLoading">
          <UCard
            v-for="i in (totalMembers - members.length + 7)"
            :ui="{
              background: 'bg-white dark:bg-slate-950'
            }"
          >
            <div class="mx-auto my-0 h-24 w-24 aspect-square">
              <USkeleton class="w-full h-full" />
            </div>

            <div class="space-y-4 w-full mt-4">
              <div v-for="w in ['w-52 h-8', 'w-36 h-4']" class="flex justify-center">
                <USkeleton :class="w" />
              </div>
            </div>
          </UCard>
        </template>
      </div>

    </GenericCardWithActions>
  </div>
</template>

<style scoped lang="css">

</style>
