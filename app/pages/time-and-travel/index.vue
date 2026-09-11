<script setup lang="ts">
import {useSelfUserStore} from "~/stores/useSelfUser";

definePageMeta({
  layout: "time-and-travel"
});

useHead({
  title: "Mes déclarations"
})

const selfStore = useSelfUserStore()
const {member, selectedProfile} = storeToRefs(selfStore)
</script>

<template>
  <div>
    <ErrorModuleNotEnabled v-if="!selectedProfile?.club.timeAndTravelEnabled" />
    <TimeAndTravelMemberBoard v-else-if="member" :member="member" :self="true" :show-vehicles="false" />
    <GenericCard v-else class="text-center">
      <p>Aucune fiche membre n'est associée à ce compte pour ce club.</p>
    </GenericCard>
  </div>
</template>
