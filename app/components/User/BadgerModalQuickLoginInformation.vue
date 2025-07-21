<script setup lang="ts">

import {generateBadgerLoginPath} from "~/utils/resource";

const props = defineProps({
  clubUuid: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['close'])

const isLoading = ref(false);

async function login() {
  isLoading.value = true
  await navigateTo(generateBadgerLoginPath(props.clubUuid, props.token))
  emit('close', true)
}

</script>

<template>
  <ModalWithActions :dismissible="false" title="Connexion en mode badgeuse/pointeuse" cancel-text="Fermer" @close="(state: boolean) => emit('close', state)">

    <PresenceBadgerConfigInfos :club-uuid="props.clubUuid" :badger-token="props.token" />

    <template #actions>
      <UButton
        :loading="isLoading"
        @click="login()"
      >
        Connexion
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
