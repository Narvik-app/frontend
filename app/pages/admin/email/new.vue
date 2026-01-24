<script lang="ts" setup>
import type {Member} from "~/types/api/item/clubDependent/member";
import TextEditor from '~/components/TextEditor.vue';
import {useSelfUserStore} from '~/stores/useSelfUser';
import EmailQuery from "~/composables/api/query/clubDependent/plugin/emailing/EmailQuery";
import EmailTemplateQuery from "~/composables/api/query/clubDependent/plugin/emailing/EmailTemplateQuery";
import type {EmailTemplate} from "~/types/api/item/clubDependent/plugin/emailing/emailTemplate";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {decodeUrlUuid, displayError} from "~/utils/resource";
import {Permission} from "~/types/api/permissions";

const MAX_ATTACHMENT_SIZE_MB = 15

  definePageMeta({
    layout: "email"
  })

  useHead({
    title: 'Nouveau mail'
  })

  const route = useRoute()

  const selectedMembers: Ref<Member[]> = ref([])

  const memberQuery = new MemberQuery()
  const emailQuery = new EmailQuery()
  const templateQuery = new EmailTemplateQuery()

  const selfStore = useSelfUserStore()
  const { selectedProfile } = storeToRefs(selfStore)

  // Permission checks - can() already includes admin check
  const canAccessTemplates = selfStore.can(Permission.EmailTemplateAccess)

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
    let value = maxMonthlyEmails.value - currentMonthEmailsSent.value
    if (value < 0) value = 0
    return value
  })

  const toast = useToast()
  const isSending = ref(false)
  const memberSelectionModalOpen = ref(false)
  const templateModalOpen = ref(false)
  const barColor = computed(() => {
    return maxMonthlyEmails.value - newMonthEmailsSent.value < 0 ? "error" : "primary"
  })

  const editor = ref()
  const title = ref('')
  const htmlContent = ref('')
  const replyTo = ref('')
  const sendAsNewsletter = ref(true)
  const attachment = ref(undefined)
  const baseFormData: Ref<FormData | undefined> = ref(undefined)
  const templates: Ref<EmailTemplate[]> = ref([])
  const selectedTemplate: Ref<EmailTemplate | undefined> = ref(undefined)

  function filterMembers() {
    if (sendAsNewsletter.value) {
      // Remove members who disabled newsletter from the select menu and the receivers list
      selectedMembers.value = selectedMembers.value.filter(member => member.clubNewsletter)
    }
  }

  function removeMember(member: Member) {
    selectedMembers.value = selectedMembers.value.filter(m => m.email !== member.email)
  }

  function updateAttachment(event: any) {
    const formData = getFileFormDataFromUInputChangeEvent(event)
    if (formData) {
      const file = formData.get("file") as File
      if (file.size > MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
        toast.add({
          title: "Impossible d'ajouter la pièce jointe",
          description: `La pièce jointe ne doit pas dépasser ${MAX_ATTACHMENT_SIZE_MB} Mo`,
          color: "error"
        })
        deleteAttachment()
        return
      }

      baseFormData.value = formData
    }
  }

  function deleteAttachment() {
    baseFormData.value = undefined
    attachment.value = undefined
  }

  async function getEmailTemplates() {
    const { items, totalItems, error } = await templateQuery.getAll()

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
      return
    }

    templates.value = items
  }

  function loadTemplate() {
    console.log("Loading template")

    title.value = selectedTemplate.value?.title
    htmlContent.value = selectedTemplate.value?.content
    sendAsNewsletter.value = selectedTemplate.value?.isNewsletter

    deleteAttachment()
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
    if (replyTo.value.length > 0) {
      payload.append("replyTo", replyTo.value)
    }

    const { error } = await emailQuery.sendEmail(payload)
    isSending.value = false

    if (error) {
      toast.add({
        title: "Une erreur est survenue",
        description: error.message,
        color: "error"
      })
      return
    }

    toast.add({
      title: "Mail envoyé",
      description: `Votre mail a été envoyé à ${selectedMembers.value.length} ${selectedMembers.value.length > 1 ? "membres" : "membre"} !`,
      color: "success"
    })

    await selfStore.refreshSelectedClub()
    navigateTo("/admin/email")
  }

  const sendButtonDisabled = computed(() => {
    return reasons.value.length > 0 ? true : false
  })
  const reasons = computed(() => {
    const errors: string[] = []

    // Check quota
    if ((maxMonthlyEmails.value ?? 0) - newMonthEmailsSent.value < 0) {
      errors.push("Quota dépassé !")
    }

    // Title cannot be empty
    if (title.value === "") {
      errors.push("Aucun sujet")
    }

    if (replyTo.value.length > 0 && !String(replyTo.value).toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
      errors.push("Répondre à : Email invalide")
    }

    // Content cannot be empty
    if (editor.value?.isEmpty) {
      errors.push("Email sans contenu")
    }

    // At least one receiver must be selected
    if (selectedMembers.value.length === 0) {
      errors.push("Aucun destinataire sélectionné")
    }

    return errors
  })

  async function loadMemberFromQuery() {
    const memberUuids = route.query.members

    // Handle members parameter (supports both single and multiple members)
    if (memberUuids && typeof memberUuids === 'string') {
      const uuidList = memberUuids.split(',').filter(uuid => uuid.trim().length > 0)
      const loadedMembers: Member[] = []
      let firstErrorMessage = ''

      for (const encodedUuid of uuidList) {
        try {
          const { retrieved, error } = await memberQuery.get(decodeUrlUuid(encodedUuid.trim()))

          if (error) {
            if (!firstErrorMessage) {
              firstErrorMessage = error.message || 'Erreur de chargement'
            }
            continue
          }

          if (retrieved) {
            loadedMembers.push(retrieved)
          }
        } catch (e) {
          if (!firstErrorMessage) {
            firstErrorMessage = e instanceof Error ? e.message : String(e)
          }
        }
      }

      if (loadedMembers.length > 0) {
        selectedMembers.value = loadedMembers

        if (loadedMembers.length < uuidList.length) {
          toast.add({
            description: `${uuidList.length - loadedMembers.length} membres n'ont pas pu être chargés`,
            color: "warning"
          })
        }
      } else if (uuidList.length > 0) {
        // Show the first error message or a generic message
        displayError(
          firstErrorMessage || "Aucun membre n'a pu être chargé",
          "Chargement impossible"
        )
      }
    }
  }

  onMounted(() => {
    // Only fetch templates if user has permission
    if (canAccessTemplates) {
      getEmailTemplates()
    }
    loadMemberFromQuery()
  })

</script>

<template>
  <GenericLayoutContentWithStickySide v-if="selectedProfile">
    <template #main>
      <GenericCardWithActions title="Envoi d'un email">
        <template #actions>
          <div class="pl-2 pb-3">
            <UButton label="Envoyer" icon="heroicons-paper-airplane" :disabled="sendButtonDisabled" :loading="isSending" @click="sendEmail" />
          </div>
        </template>

        <div class="flex flex-col gap-4">

          <UFormField class="flex-1" label="Sujet">
            <UInput size="xl" v-model="title" />
          </UFormField>

          <UFormField class="flex-1" label="Répondre à" help="Par défaut reprendra l'adresse mail configuré par l'administrateur.">
            <UInput v-model="replyTo" type="email" />
          </UFormField>

          <UFormField label="Pièce-jointe" :help="`Taille maximum : ${MAX_ATTACHMENT_SIZE_MB} Mo`">
            <UFieldGroup class="w-full">
              <UInput
                v-model="attachment"
                type="file"
                icon="i-heroicons-paper-clip"
                @change="updateAttachment"
              />
              <UButton
                v-if="baseFormData"
                icon="i-heroicons-trash"
                label="Supprimer"
                @click="deleteAttachment"
              />
            </UFieldGroup>
          </UFormField>


          <UFormField label="Newsletter">
            <UCheckbox v-model="sendAsNewsletter" @change="filterMembers()" />

            <template #help>
              <p v-if="sendAsNewsletter">L'email ne sera envoyé qu’aux destinataires ayant donné leur accord.</p>
              <div v-else>
                <p>L'email sera envoyé à tous les destinataires.</p>
              </div>
            </template>
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
      <UCard>
        <div class="flex gap-1 justify-between items-center mb-2">Emails restants : {{ remainingEmailsDisplay }} <UBadge v-if="selectedMembers.length > 0">+ {{ selectedMembers.length }}</UBadge></div>
        <UProgress
          v-model="newMonthEmailsSentCapped"
          :max="maxMonthlyEmails"
          :color="barColor"
        />
        <div class="text-center text-xs mb-2 select-none">{{ (currentMonthEmailsSent ?? 0) + selectedMembers.length }} / {{ maxMonthlyEmails }}</div>
        <ContentLink to="https://about.narvik.app/abonnements" target="_blank">Augmentez votre quota</ContentLink>
      </UCard>

      <UCard v-if="canAccessTemplates">
        <div class="flex flex-col gap-2">
          <p>Modèles</p>
          <UFieldGroup class="w-full">
            <USelectMenu
              :items="templates"
              v-model="selectedTemplate"
              label-key="name"
              placeholder="Rechercher un modèle"
            />

            <UButton
              v-if="selectedTemplate"
              label="Charger"
              @click="() => {
                if (editor.isEmpty && title === '' && !attachment) {
                  loadTemplate()
                  return
                }

                templateModalOpen = true
              }"
            />
          </UFieldGroup>
        </div>

        <UModal v-model:open="templateModalOpen">
          <template #content>
            <div>
              <UCard>
                <div class="flex flex-col gap-4">
                  <div class="text-xl font-bold text-center">Charger le modèle ?</div>
                  <UAlert
                    class="mb-4"
                    variant="subtle"
                    color="warning"
                    description="Vous avez entré des informations qui seront écrasées si vous chargez ce modèle."
                  />
                  <div class="flex justify-end gap-2">
                    <UButton label="Annuler" variant="ghost" color="neutral" @click="templateModalOpen = false" />
                    <UButton label="Charger le modèle" color="warning" @click="loadTemplate(); templateModalOpen = false" />
                  </div>
                </div>
              </UCard>
            </div>
          </template>
        </UModal>
      </UCard>

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

      <UCard>
        <div class="flex justify-between items-center gap-1 flex-wrap">
          <p>Destinataires ({{ selectedMembers.length }})</p>

          <UModal
            v-model:open="memberSelectionModalOpen"
            title="Choix des destinataires"
            :description="sendAsNewsletter ? 'Seuls les membres inscrits à la newsletter recevront une notification.' : ''"
            :ui="{
            content: 'max-w-[80vw]'
          }"
          >
            <UButton :label="selectedMembers.length > 0 ? 'Modifier les destinataires' : 'Choisir les destinataires'" />

            <template #body>
              <EmailReceiverSelection :newsletter-enabled="sendAsNewsletter" v-model="selectedMembers" @update:model-value="val => selectedMembers = val" @close="memberSelectionModalOpen = false" />
            </template>
          </UModal>
        </div>

        <div class="flex gap-1 mt-2 flex-wrap">
          <MemberBadge
            v-for="(member) in selectedMembers"
            :key="member.email"
            :member="member"
            :clickable="true"
            @clicked="removeMember"
          />
        </div>
      </UCard>
    </template>
  </GenericLayoutContentWithStickySide>
</template>
