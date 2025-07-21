<script setup lang="ts">

import ClubQuery from "~/composables/api/query/ClubQuery";
import type {PropType} from "vue";
import type {WriteClub} from "~/types/api/item/club";

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

const isLoading = ref(false)
const securityCode = ref('')

async function getInfos() {
  isLoading.value = true
  const clubQuery = new ClubQuery()
  const { retrieved } = await clubQuery.getBadgerQuickLogin()
  isLoading.value = false
  securityCode.value = retrieved.securityCode
}

getInfos()
</script>

<template>
  <ModalWithActions title="Code de connexion rapide" cancel-text="Fermer" @close="(state: boolean) => emit('close', state)">

    <USkeleton v-if="isLoading" class="h-10 w-1/3 mx-auto" />
    <p v-else class="text-4xl text-center font-bold">
      {{ securityCode }}
    </p>

    <p class="text-xs">Ce code est valable 10 minutes.</p>

    <template #actions>
      <UButton
        :loading="isLoading"
        @click="getInfos()"
      >
        Connexion
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
