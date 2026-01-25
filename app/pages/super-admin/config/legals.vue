<script setup lang="ts">

import GlobalSettingQuery from "~/composables/api/query/GlobalSettingQuery";
import dayjs from "dayjs";
import {displayApiError} from "~/utils/resource";
import {GlobalSettingPublicEnum} from "~/types/api/item/globalSetting";
import {getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import FileQuery from "~/composables/api/query/FileQuery";
import {createBrowserPdfDownload} from "~/utils/browser";

definePageMeta({
  layout: "super-admin"
});

useHead({
  title: 'Configuration documents légaux'
})

const toast = useToast()
const isUploading = ref(false)

const popoverLegalsOpen = ref(false)

const legalsLastUpdate: Ref<Date|undefined> = ref(undefined)
const legalsCguLink: Ref<string|undefined> = ref(undefined)
const legalsCgvLink: Ref<string|undefined> = ref(undefined)
const legalsPrivacyLink: Ref<string|undefined> = ref(undefined)

const globalSettingQuery = new GlobalSettingQuery();

async function loadLegalsLastUpdate() {
  const { retrieved } = await globalSettingQuery.getPublic(GlobalSettingPublicEnum.LEGALS_LAST_UPDATE)
  if (retrieved) {
    legalsLastUpdate.value = retrieved.value ? dayjs(retrieved.value).toDate() : undefined
  }
}

async function loadLegalsCgu() {
  const { retrieved } = await globalSettingQuery.getPublic(GlobalSettingPublicEnum.LEGALS_CGU)
  if (retrieved) {
    legalsCguLink.value = retrieved.value
  }
}

async function loadLegalsCgv() {
  const { retrieved } = await globalSettingQuery.getPublic(GlobalSettingPublicEnum.LEGALS_CGV)
  if (retrieved) {
    legalsCgvLink.value = retrieved.value
  }
}

async function loadLegalsPrivacy() {
  const { retrieved } = await globalSettingQuery.getPublic(GlobalSettingPublicEnum.LEGALS_PRIVACY_POLICY)
  if (retrieved) {
    legalsPrivacyLink.value = retrieved.value
  }
}

async function loadLegals() {
  isUploading.value = true
  await Promise.all([
    loadLegalsLastUpdate(),
    loadLegalsCgu(),
    loadLegalsCgv(),
    loadLegalsPrivacy()
  ])
  isUploading.value = false
}

async function updateLegalsDate() {
  if (!legalsLastUpdate.value) {
    return
  }

  const { error } = await globalSettingQuery.updateLegals(legalsLastUpdate.value)
  if (error) {
    displayApiError(error)
  }

  toast.add({
    title: 'Date modifiée'
  })
  loadLegals()
}

async function updateLegalsFile(event: Event, type: string) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  formData.append('type', type)

  isUploading.value = true
  const { error } = await globalSettingQuery.updateLegalsFile(formData)
  isUploading.value = false

  if (error) {
    displayApiError(error)
  } else {
    toast.add({
      title: 'Fichier modifiée'
    })
  }

  loadLegals()
}

async function displayPdf(filename: string, encodedUuid: string) {
  const fileQuery = new FileQuery()
  const { retrieved } = await fileQuery.getPublic(encodedUuid)

  if (!retrieved) {
    return
  }

  createBrowserPdfDownload(filename, retrieved.base64)
}

// Code run at page load
loadLegals()

</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <GenericCard title="Date de dernière mise à jour">
      <p class="text-xs mb-2">Utilisée pour afficher la modal de consentement à la connexion.</p>
      <UPopover v-model:open="popoverLegalsOpen">
        <UButton icon="i-heroicons-calendar-days-20-solid" :label="formatDateReadable(legalsLastUpdate?.toString()) || 'Choisir une date'" :loading="isUploading" />

        <template #content>
          <div>
            <GenericDatePicker v-model="legalsLastUpdate" mode="date" @close="popoverLegalsOpen = false; updateLegalsDate()" />
          </div>
        </template>
      </UPopover>
    </GenericCard>
    <GenericCard title="Conditions Générales de vente">
      <UInput
        :loading="isUploading"
        type="file"
        accept="application/pdf"
        icon="i-heroicons-document"
        @change="event => { updateLegalsFile(event, 'cgv') }"
      />

      <UButton
          v-if="legalsCgvLink"
          class="mt-2"
          @click="displayPdf('cgv.pdf', legalsCgvLink)"
      >
        Afficher le pdf
      </UButton>
    </GenericCard>
    <GenericCard title="Conditions Générales d'Utilisation">
      <UInput
        :loading="isUploading"
        type="file"
        accept="application/pdf"
        icon="i-heroicons-document"
        @change="event => { updateLegalsFile(event, 'cgu') }"
      />

      <UButton
          v-if="legalsCguLink"
          class="mt-2"
          @click="displayPdf('cgu.pdf', legalsCguLink)"
      >
        Afficher le pdf
      </UButton>
    </GenericCard>
    <GenericCard title="Politique de confidentialité">
      <UInput
        :loading="isUploading"
        type="file"
        accept="application/pdf"
        icon="i-heroicons-document"
        @change="event => { updateLegalsFile(event, 'privacy-policy') }"
      />

      <UButton
          v-if="legalsPrivacyLink"
          class="mt-2"
          @click="displayPdf('politique-confidentialite.pdf', legalsPrivacyLink)"
      >
        Afficher le pdf
      </UButton>
    </GenericCard>
  </div>
</template>


<style lang="css" scoped>

</style>

