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
    clubUuid.value = decodeUrlUuid(clubId?.toString())

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
        // description: error.message,
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
      <p class="text-xl font-bold">Vous ne recevrez plus de newsletter de la part de l'association</p>
      <div>
        <p>Vous pouvez fermer cette page</p>
      </div>
    </div>
  </UCard>
  <UCard v-else>
    <div class="flex flex-col gap-4 text-center">
      <p class="text-2xl font-bold">
        <template v-if="isLogged">
          {{ club?.name }}
        </template>
        <template v-else>
          Se désabonner
        </template>
      </p>
      <p>Vous ne recevrez plus de newsletter de la part de l'association.</p>

      <UFormField label="Email">
        <UButtonGroup class="w-full" size="lg">
          <UInput
            v-model="email"
            icon="i-heroicons-envelope"
            type="email"
          />
          <UButton
            label="Se désabonner"
            :disabled="buttonDisabled"
            :loading="isLoading"
            @click="unsubscribe"
          />
        </UButtonGroup>
      </UFormField>
    </div>
  </UCard>
</template>
