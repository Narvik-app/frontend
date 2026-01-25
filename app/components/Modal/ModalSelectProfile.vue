<script setup lang="ts">

import {useSelfUserStore} from "~/stores/useSelfUser";
import type {SelectApiItem} from "~/types/select";
import type {LinkedProfile} from "~/types/api/linkedProfile";

const emit = defineEmits(['selected', 'close'])

const selfStore = useSelfUserStore()
const { user, member, selectedProfile } = storeToRefs(selfStore)

const isLoading = ref(false)
const selectedProfileId: Ref<string|undefined> = ref(selectedProfile.value?.id)

const items = computed( () => {
  const items: SelectApiItem<LinkedProfile>[] = []
  user.value?.linkedProfiles?.forEach(value => {
    items.push({
      label: value.displayName,
      value: value.id
    })
  })
  return items;
})

async function applyProfile() {
  if (!selectedProfileId.value || !user.value?.linkedProfiles) return

  isLoading.value = true
  const foundProfile = user.value.linkedProfiles.find( (profile) => profile.id === selectedProfileId.value)
  if (foundProfile) {
    member.value = undefined
    selectedProfile.value = foundProfile
  }

  await selfStore.refresh()
  isLoading.value = false
  emit('selected')
  emit('close', true)
}

</script>

<template>
  <ModalWithActions title="Choix du profil" @close="(state: boolean) => emit('close', state)">

    <div>
      <USelect
        v-model="selectedProfileId"
        :items="items"
        placeholder="Aucun profil défini" />
    </div>

    <template #actions>
      <UButton
        :loading="isLoading"
        color="warning"
        @click="applyProfile"
      >
        Changer
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
