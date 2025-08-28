<script lang="ts" setup>
  import EmailTemplateQuery from '~/composables/api/query/clubDependent/plugin/emailing/EmailTemplateQuery';
  import type { EmailTemplate } from '~/types/api/item/clubDependent/plugin/emailing/emailTemplate';

  definePageMeta({
    layout: "email"
  })

  useHead({
    title: "Nouveau modèle"
  })

  const templateQuery = new EmailTemplateQuery()
  
  const selfStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfStore)

  // Redirect to main page if there's no profile
  if (!selectedProfile.value) {
    navigateTo("/")
  }

  const toast = useToast()
  const isCreating = ref(false)

  const name = ref('')
  const editor = ref()
  const title = ref('')
  const htmlContent = ref('')
  const newsletter = ref(true)

  const createButtonDisabled = computed(() => {
    return reasons.value.length > 0
  })
  const reasons = computed(() => {
    const errors: string[] = []

    if (title.value === "") {
      errors.push("Aucun sujet")
    }

    if (editor.value?.isEmpty) {
      errors.push("Modèle sans contenu")
    }

    return errors
  })

  async function submitTemplate() {
    isCreating.value = true

    const template: EmailTemplate = {
      name: name.value,
      title: title.value,
      content: htmlContent.value,
      isNewsletter: newsletter.value
    }

    const { created, error } = await templateQuery.post(template)

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
      isCreating.value = false
      return
    }

    toast.add({
      title: "Modèle créé",
      description: `Le modèle "${created?.name}" a été enregistré !`,
      color: "success"
    })

    navigateTo("/admin/email/templates")
  }
</script>

<template>
  <GenericLayoutContentWithStickySide v-if="selectedProfile">
    <template #main>
      <GenericCardWithActions title="Création d'un modèle">
        <template #actions>
          <div class="pl-2 pb-3">
            <UButton label="Créer" icon="i-heroicons-plus" :disabled="createButtonDisabled" :loading="isCreating" @click="submitTemplate" />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <UFormField class="flex-1" label="Sujet">
            <UInput size="xl" v-model="title" />
          </UFormField>

          <TextEditor
            :model-value="htmlContent"
            @update:model-value="htmlContent = $event"
            @update:editor="editor = $event"
          />
        </div>
      </GenericCardWithActions>
    </template>

    <template #side>
      <GenericCard title="Options du modèle">
        <div class="flex flex-col gap-4">
          <UFormField label="Nom">
            <UInput v-model="name" />
          </UFormField>
  
          <UFormField label="Newsletter">
            <UCheckbox v-model="newsletter" />
  
            <template #help>
              <p v-if="newsletter">Envoyer uniquement aux destinataires ayant donné leur accord.</p>
              <p v-else>Envoyer à tous les destinataires</p>
            </template>
          </UFormField>
        </div>
      </GenericCard>

      <UCard v-if="reasons.length > 0">
        <ul>
          <li
            v-for="(reason, index) in reasons"
            :key="index"
            class="text-error flex items-center"
          >
            <UIcon name="i-heroicons-x-circle" />
            <span class="ml-1">{{ reason }}</span>
          </li>
        </ul>
      </UCard>
    </template>
  </GenericLayoutContentWithStickySide>
</template>