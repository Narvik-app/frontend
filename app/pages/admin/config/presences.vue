<script setup lang="ts">

import {useSelfUserStore} from "~/stores/useSelfUser";
import ClubModalGenerateBadger from "~/components/Club/ClubModalGenerateBadger.vue";
import type {Club} from "~/types/api/item/club";
import ClubModalBadgerQuickLogin from "~/components/Club/ClubModalBadgerQuickLogin.vue";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Configuration présences'
})

const overlay = useOverlay()

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)

const badgerSetting: Ref<string | undefined> = ref(selectedProfile.value?.club.badgerToken);

</script>

<template>
  <ErrorModuleNotEnabled v-if="!selectedProfile?.club.presencesEnabled" />
  <div v-else class="grid gap-4 md:grid-cols-2">
    <GenericCardWithActions class="md:col-span-2" title="Connexion en mode badgeuse/pointeuse">
      <template #actions>
        <UButton
          icon="i-heroicons-arrow-path"
          @click="
          overlay.create(ClubModalGenerateBadger).open({
            onGenerated(newClub: Club) {
              badgerSetting = newClub.badgerToken
              selfStore.refreshSelectedClub()
              useToast().add({title: 'Lien de connexion généré'})
            }
          })"
        >
          Générer un nouveau lien
        </UButton>
        <UButton v-if="badgerSetting"
          icon="i-heroicons-key"
          @click="overlay.create(ClubModalBadgerQuickLogin).open()">
          Connexion rapide
        </UButton>

      </template>

      <template #default>
        <PresenceBadgerConfigInfos :badger-token="badgerSetting" :club-uuid="selectedProfile.club.uuid" />
        <UButton class="mt-4" to="https://docs.narvik.app/frontend/docs/membres/presences.html#connexion-en-mode-badgeuse-pointeuse" target="_blank">Documentation</UButton>
      </template>
    </GenericCardWithActions>
  </div>
</template>


<style lang="css" scoped>

</style>

