<script lang="ts" setup>
import EmailTemplateQuery from '~/composables/api/query/clubDependent/plugin/emailing/EmailTemplateQuery';
import type {EmailTemplate} from '~/types/api/item/clubDependent/plugin/emailing/emailTemplate';

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
  <EmailTemplateEditor/>
</template>
