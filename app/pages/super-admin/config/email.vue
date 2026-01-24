<script setup lang="ts">

import GlobalSettingQuery from "~/composables/api/query/GlobalSettingQuery";
import {
  GLOBAL_SETTINGS_SMTP_BOOLEAN_MAPPING,
  GLOBAL_SETTINGS_SMTP_STRING_MAPPING,
  type SmtpConfig
} from "~/types/api/smtp";
import type {FormError, FormErrorEvent} from "#ui/types";

definePageMeta({
  layout: "super-admin"
});

useHead({
  title: 'Configuration email'
})

const toast = useToast()
const isLoading = ref(false)

const globalSettingQuery = new GlobalSettingQuery();

const smtpSetting: Ref<SmtpConfig> = ref({});
const smtpEnabled: Ref<boolean> = ref(false)
const testEmail = ref('')
loadSmtpSettings()

async function loadSmtpSettings() {
  isLoading.value = true

  for (const [key, value] of Object.entries(GLOBAL_SETTINGS_SMTP_BOOLEAN_MAPPING)) {
    const {retrieved} = await globalSettingQuery.get(value)
    if (retrieved) {
      let setValue: boolean = false
      if (retrieved.value) {
        if (retrieved.value === '1' || retrieved.value.toLowerCase() === 'true') {
          setValue = true
          if (key === 'on') {
            smtpEnabled.value = true
          }
        }
      }
      // @ts-expect-error - dynamic key access for SMTP settings
      smtpSetting.value[key] = setValue
    }
  }

  for (const [key, value] of Object.entries(GLOBAL_SETTINGS_SMTP_STRING_MAPPING)) {
    const { retrieved } = await globalSettingQuery.get(value)
    if (retrieved) {
      let setValue: string|null = null
      if (retrieved.value) {
        setValue = retrieved.value
      }
      // @ts-expect-error - dynamic key access for SMTP settings
      smtpSetting.value[key] = setValue
    }
  }

  isLoading.value = false
}

const validate = (state: any): FormError[] => {
  if (!smtpSetting.value.on) {
    return []
  }

  const errors = []
  if (!state.host) errors.push({ name: 'host', message: 'Champ requis' })
  if (!state.port) errors.push({ name: 'port', message: 'Champ requis' })
  if (!state.sender) errors.push({ name: 'sender', message: 'Champ requis' })
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function updateSmtpSetting() {
  isLoading.value = true
  const { item, error } = await globalSettingQuery.updateSmtpConfig(smtpSetting.value)
  isLoading.value = false

  if (error || !item) {
    toast.add({
      title: "Une erreur est survenue",
      color: "error"
    })
    return
  }

  toast.add({
    color: "success",
    title: "Configuration mise à jour"
  })

  await loadSmtpSettings()
}

async function testSmtp() {
  if (testEmail.value.trim().length < 5) {
    return
  }
  await globalSettingQuery.testSmtp(testEmail.value.trim())

  toast.add({
    color: "success",
    title: "Email envoyé"
  })
}

</script>

<template>
  <GenericLayoutContentWithStickySide mobile-side-title="Tester la configuration">
    <template #main>
      <GenericCard title="Configuration SMTP">

        <UButton
          size="xs"
          icon="i-heroicons-arrow-path"
          class="mb-4"
          :loading="isLoading"
          @click="loadSmtpSettings()"
        >
          Récupérer la configuration depuis le serveur
        </UButton>

        <UProgress v-if="isLoading" animation="swing" class="mb-2" />
        <UForm v-else class="flex gap-2 flex-col" :state="smtpSetting" :validate="validate" autocomplete="off" @submit="updateSmtpSetting" @error="onError">
          <UFormField label="Activé">
            <USwitch v-model="smtpSetting.on" />
          </UFormField>

          <div v-if="smtpSetting.on">
            <UFormField label="Hôte" name="host" required>
              <UInput v-model="smtpSetting.host" />
            </UFormField>

            <UFormField label="Port" name="port" required>
              <UInput v-model="smtpSetting.port" />
            </UFormField>

            <UFormField label="Utilisateur" name="username">
              <UInput v-model="smtpSetting.username" />
            </UFormField>

            <UFormField label="Mot de passe" name="password">
              <UInput v-model="smtpSetting.password" type="password" />
            </UFormField>

            <UFormField label="Email expéditeur" name="sender" required>
              <UInput v-model="smtpSetting.sender" />
            </UFormField>

            <UFormField label="Email newsletter" name="newsletterSender" required>
              <UInput v-model="smtpSetting.newsletterSender" />
            </UFormField>

            <UFormField label="Nom expéditeur" name="senderName">
              <UInput v-model="smtpSetting.senderName" />
            </UFormField>
          </div>

          <UButton
            type="submit"
            block
            class="mt-2"
            :loading="isLoading"
          >
            Modifier
          </UButton>
        </UForm>

      </GenericCard>
    </template>

    <template #side>
      <GenericCard title="Tester la configuration SMTP">
        <UFormField label="Adresse mail" name="testEmail">
          <UInput v-model="testEmail" type="email" />
        </UFormField>

        <UButton
          type="submit"
          block
          class="mt-4"
          :loading="isLoading"
          :disabled="(!smtpEnabled || !smtpSetting.on)"
          @click="testSmtp()"
        >
          Envoyer le mail
        </UButton>
      </GenericCard>
    </template>
  </GenericLayoutContentWithStickySide>
</template>


<style lang="css" scoped>

</style>

