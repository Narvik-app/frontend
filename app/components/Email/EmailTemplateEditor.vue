<script setup lang="ts">
import EmailTemplateQuery from '~/composables/api/query/clubDependent/plugin/emailing/EmailTemplateQuery'
import type {EmailTemplate} from '~/types/api/item/clubDependent/plugin/emailing/emailTemplate'

const props = defineProps({
    templateId: {
      type: String,
      required: false
    }
  })

  const templateQuery = new EmailTemplateQuery()

  const toast = useToast()
  const isSubmitting = ref(false)
  const isLoading = ref(true)

  const name = ref('')
  const editor = ref()
  const title = ref('')
  const htmlContent = ref('')
  const newsletter = ref(true)
  const isNew = ref(true)

  const buttonDisabled = computed(() => {
    return reasons.value.length > 0 || isLoading.value
  })
  const reasons = computed(() => {
    const errors: string[] = []

    if (name.value === "") {
      errors.push("Aucun nom")
    }

    if (title.value === "") {
      errors.push("Aucun sujet")
    }

    if (editor.value?.isEmpty) {
      errors.push("Modèle sans contenu")
    }

    return errors
  })

  async function submitTemplate() {
    isSubmitting.value = true
    let errorMessage = null

    const template: EmailTemplate = {
      name: name.value,
      title: title.value,
      content: htmlContent.value,
      isNewsletter: newsletter.value
    }

    if (isNew.value) {
      const { created, error } = await templateQuery.post(template)

      if (error) {
        errorMessage = error.message
        isSubmitting.value = false
      } else {
        toast.add({
          title: "Modèle créé",
          description: `Le modèle "${created?.name}" a été enregistré !`,
          color: "success"
        })
        navigateTo("/admin/email/templates")
      }
    } else {
      const { error } = await templateQuery.update(props.templateId, template)

      if (error) {
        errorMessage = error.message
      } else {
        toast.add({
          title: "Modèle enregistré",
          color: "success"
        })
      }
      isSubmitting.value = false
    }

    if (errorMessage) {
      toast.add({
        title: "Une erreur est survenue",
        description: errorMessage,
        color: "error"
      })
      return
    }
  }

  async function initialize() {
    if (!props.templateId) {
      isLoading.value = false
      return
    }

    isNew.value = false

    const { retrieved, error } = await templateQuery.get(props.templateId)

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
      navigateTo("/admin/email/templates")
      return
    }

    if (retrieved) {
      name.value = retrieved.name
      title.value = retrieved.title
      htmlContent.value = retrieved.content
      newsletter.value = retrieved.isNewsletter
      isLoading.value = false
    }
  }

  initialize()
</script>

<template>
  <GenericLayoutContentWithStickySide>
    <template #main>
      <GenericCardWithActions :title="isNew ? 'Nouveau modèle' : 'Éditeur de modèle'">
        <template #actions>
          <div class="pl-2 pb-3">
            <UButton
              :label="isNew ? 'Créer' : 'Enregistrer'"
              :icon="isNew ? 'i-heroicons-plus' : 'i-heroicons-pencil-square'"
              :disabled="buttonDisabled"
              :loading="isSubmitting"
              @click="submitTemplate"
            />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <UFormField class="flex-1" label="Sujet">
            <UInput v-model="title" size="xl" :disabled="isLoading" />
          </UFormField>

          <TextEditor
            :model-value="htmlContent"
            :disabled="isLoading"
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
            <UInput v-model="name" :disabled="isLoading" />
          </UFormField>

          <UFormField label="Newsletter">
            <UCheckbox v-model="newsletter" :disabled="isLoading" />

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
