<script lang="ts" setup>
  import type {Member} from "~/types/api/item/clubDependent/member";
  import TextEditor from '~/components/TextEditor.vue';
  import { useSelfUserStore } from '~/stores/useSelfUser';
  import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
  import EmailQuery from "~/composables/api/query/clubDependent/plugin/emailing/EmailQuery";

  const MAX_ATTACHMENT_SIZE_MB = 15

  definePageMeta({
    layout: "email"
  })

  useHead({
    title: 'Nouveau mail'
  })
  
  const memberQuery = new MemberQuery()
  const allMembers: Ref<Member[]> = ref([])
  const filteredMembers: Ref<Member[]> = ref([])
  const selectedMembers: Ref<Member[]> = ref([])

  const emailQuery = new EmailQuery()
  
  const selfStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfStore)

  // Redirect to main page if there's no profile
  if (!selectedProfile.value) {
    navigateTo("/")
  }
  
  const currentMonthEmailsSent = ref(selectedProfile.value?.club.currentMonthEmailsSent)
  const maxMonthlyEmails = ref(selectedProfile.value?.club.maxMonthlyEmails)
  const newMonthEmailsSent = computed(() => currentMonthEmailsSent.value + selectedMembers.value.length)
  const newMonthEmailsSentCapped = computed(() => {
    if (newMonthEmailsSent.value > maxMonthlyEmails.value) {
      return maxMonthlyEmails.value
    } else {
      return newMonthEmailsSent.value
    }
  })
  const remainingEmailsDisplay = computed(() => {
    let value = maxMonthlyEmails.value - currentMonthEmailsSent.value - selectedMembers.value.length
    if (value < 0) value = 0
    return value
  })
  
  const toast = useToast()
  const isSending = ref(false)
  const barColor = computed(() => {
    return maxMonthlyEmails.value - newMonthEmailsSent.value < 0 ?
    "error" :
    "primary"
  })
  
  const editor = ref()
  const title = ref('')
  const htmlContent = ref('')
  const sendAsNewsletter = ref(true)
  const baseFormData: Ref<FormData | undefined> = ref(undefined)

  await getMembers()
  filterMembers()

  async function getMembers() {
    const { items } = await memberQuery.getAll()
    allMembers.value = items.filter(member => member.email)
  }

  function filterMembers() {
    if (sendAsNewsletter.value) {
      // Remove members who disabled newsletter from the select menu and the receivers list
      filteredMembers.value = allMembers.value.filter(member => member.clubNewsletter)
      selectedMembers.value = selectedMembers.value.filter(member => member.clubNewsletter)
    } else {
      filteredMembers.value = allMembers.value
    }
  }

  function updateAttachment(event: any) {
    const formData = getFileFormDataFromUInputChangeEvent(event)
    if (formData) {
      const file = formData.get("file") as File
      if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
        toast.add({
          title: "Impossible d'ajouter la pièce jointe",
          description: "La pièce jointe ne doit pas dépasser 15 Mo",
          color: "error"
        })
      } else {
        baseFormData.value = formData
      }
    }
  }

  function deleteAttachment() {
    baseFormData.value = undefined
  }

  async function sendEmail() {
    isSending.value = true

    let payload: FormData

    if (baseFormData.value) {
      payload = baseFormData.value
    } else {
      payload = new FormData()
    }

    payload.append("title", title.value)
    payload.append("content", htmlContent.value)
    payload.append("members", selectedMembers.value.map(member => member.uuid).join(","))
    payload.append("isNewsletter", sendAsNewsletter.value.toString())
    if (selectedProfile.value?.club?.settings?.emailReplyTo) {
      payload.append("replyTo", selectedProfile.value?.club?.settings?.emailReplyTo)
    }

    const { error } = await emailQuery.sendEmail(payload)

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
    } else {
      toast.add({
        title: "Mail envoyé",
        description: `Votre mail a été envoyé à ${selectedMembers.value.length} ${selectedMembers.value.length > 1 ? "membres" : "membre"} !`,
        color: "success"
      })

      await selfStore.refreshSelectedClub()
      navigateTo("/admin/email")
    }

    isSending.value = false
  }

  const sendButtonDisabled = computed(() => {
    return reasons.value.length > 0 ? true : false
  })
  const reasons = computed(() => {
    const errors: string[] = []

    // Check quota
    if (maxMonthlyEmails.value - newMonthEmailsSent.value < 0) {
      errors.push("Quota dépassé !")
    }

    // Title cannot be empty
    if (title.value === "") {
      errors.push("Aucun sujet")
    }

    // Content cannot be empty
    if (editor.value?.isEmpty) {
      errors.push("Email vide")
    }

    // At least one receiver must be selected
    if (selectedMembers.value.length === 0) {
      errors.push("Aucun destinataire sélectionné")
    }

    return errors
  })
</script>

<template>
  <GenericLayoutContentWithStickySide v-if="selectedProfile">
    <template #main>
      <UCard>
        <template #header>
          <UInput placeholder="Sujet" v-model="title" />
        </template>

        <div class="flex flex-col gap-4">
          <div class="flex flex-row gap-8 items-center">
            <p class="whitespace-nowrap">Pièce jointe</p>
            <UButtonGroup class="w-full">
              <UInput
                type="file"
                icon="i-heroicons-paper-clip"
                @change="updateAttachment"
              />
              <UButton
                v-if="baseFormData"
                icon="i-heroicons-trash"
                label="Supprimer"
                color="error"
                @click="deleteAttachment"
              />
            </UButtonGroup>
          </div>
  
          <TextEditor
            :model-value="htmlContent"
            @update:model-value="htmlContent = $event"
            @update:editor="editor = $event"
          />
        </div>
      </UCard>
    </template>

    <template #side>
      <UCard>
        <p>Emails restants: {{ remainingEmailsDisplay }}</p>
        <UProgress
          v-model="newMonthEmailsSentCapped"
          :max="maxMonthlyEmails"
          :color="barColor"
        />
        <ContentLink to="https://about.narvik.app/abonnements" target="_blank">Augmentez votre quota</ContentLink>
      </UCard>

      <UCard>
        <p>Destinataires</p>
        <USelectMenu
          v-model="selectedMembers"
          :items="filteredMembers"
          multiple
          label-key="fullName"
        />
        <div class="flex gap-1 mt-2 flex-wrap">
          <MemberBadge v-for="(member) in selectedMembers" :key="member.email" :member="member" />
        </div>
      
      </UCard>

      <UCard>
        <UCheckbox label="Newsletter" v-model="sendAsNewsletter" @update:model-value="filterMembers()" />
        <UButton label="Envoyer" :disabled="sendButtonDisabled" :loading="isSending" @click="sendEmail" />
        <ul>
          <li
            v-for="(reason, index) in reasons"
            :key="index"
            class="text-error flex items-center"
          >
            <UIcon name="i-heroicons-x-circle" />
            <span>{{ reason }}</span>
          </li>
        </ul>
      </UCard>
    </template>
  </GenericLayoutContentWithStickySide>
</template>