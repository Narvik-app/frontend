<script setup lang="ts">
  import { usePost } from '~/composables/api/api'
  import ClubQuery from '~/composables/api/query/ClubQuery'
  import type { Club } from '~/types/api/item/club'

  const selfUser = useSelfUserStore()
  const isLogged = selfUser.isLogged()

  const clubQuery = new ClubQuery()
  const { query } = useRoute()
  const toast = useToast()
  const clubId = query.club
  const clubUuid = ref("")

  const club: Ref<Club | undefined> = ref(undefined)

  const errorEncountered = ref(false)
  const errorMessage = ref("")

  const email = ref("")
  const buttonDisabled = computed(() => {return email.value === ""})
  const isLoading = ref(false)
  const unsubscribed = ref(false)

  if (!clubId) {
    navigateTo("/")
  } else {
    clubUuid.value = decodeUrlUuid(clubId)

    if (isLogged) {
      const { retrieved, error } = await clubQuery.get(clubUuid.value)
      
      if (!retrieved) {
        errorEncountered.value = true
        errorMessage.value = "Impossible de récupérer les informations du club."
      } else {
        club.value = retrieved
      }
    }
  }

  async function unsubscribe() {
    isLoading.value = true

    const payload = {
      "club": clubUuid.value,
      "email": email.value
    }

    const {item, error} = await usePost("/unsubscribe", payload, false)

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
    } else {
      unsubscribed.value = true
    }

    isLoading.value = false
  }
</script>

<template>
  <UCard v-if="errorEncountered">
    <div class="flex flex-col gap-4 text-center">
      <p class="text-2xl font-bold">Une erreur est survenue</p>
      <div>
        <p>{{ errorMessage }}</p>
        <ContentLink to="/">Retourner à l'accueil</ContentLink>
      </div>
    </div>
  </UCard>
  <UCard v-else-if="unsubscribed">
    <div class="flex flex-col gap-4 text-center">
      <p class="text-2xl font-bold">Succès</p>
      <div>
        <p v-if="isLogged">Vous n'êtes plus abonné à la newsletter de <span class="font-bold">{{ club?.name }}</span> !</p>
        <p v-else>Vous n'êtes plus abonné à la newsletter du club !</p>
        <p>Vous pouvez fermer cette page</p>
      </div>
    </div>
  </UCard>
  <UCard v-else>
    <div class="flex flex-col gap-4 text-center">
      <p class="text-2xl font-bold">Se désabonner</p>
      <p v-if="isLogged">Vous ne recevrez plus la newsletter de <span class="font-bold">{{ club?.name }}</span>.</p>
      <p v-else>Vous ne recevrez plus la newsletter du club.</p>
      <UButtonGroup>
        <UInput
          icon="i-heroicons-envelope"
          placeholder="Votre adresse email"
          v-model="email"
        />
        <UButton
          label="Se désabonner"
          :disabled="buttonDisabled"
          :loading="isLoading"
          @click="unsubscribe"
        />
      </UButtonGroup>
    </div>
  </UCard>
</template>