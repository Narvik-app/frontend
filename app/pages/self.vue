<script lang="ts" setup>
import {useSelfUserStore} from "~/stores/useSelfUser";

definePageMeta({
  layout: "member"
});

useHead({
  title: "Mon compte"
})

const selfStore = useSelfUserStore()
const { member, user, selectedProfile } = storeToRefs(selfStore)
</script>

<template>
  <div v-if="user" class="flex flex-col gap-4">
    <div class="text-3xl font-bold">Mon compte</div>

    <UserSelfHeader :user="user" :member="member" :club-name="selectedProfile?.club?.name" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      <div class="lg:col-span-2">
        <MemberSelfOverview v-if="member" :member="member" />
        <GenericCard v-else title="Compte lié à aucun club">
          <p>Veuillez vous assurer que l'adresse mail du compte correspond à celle enregistrée auprès de votre club.</p>
          <p>Si ce n'est pas le cas, veuillez le signaler à votre club pour que celui-ci modifie le compte lié.</p>
        </GenericCard>
      </div>

      <div class="flex flex-col gap-4">
        <UserSecurityCard :user="user" />
        <UserPasskeys />
      </div>
    </div>
  </div>
</template>
