<script lang="ts" setup>
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import ExternalPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/ExternalPresenceQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {ClubActivity} from "~/types/api/item/club";
import {Permission} from "~/types/api/permissions";

definePageMeta({
  layout: "admin"
});

useHead({
  title: "Import présences"
})

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)
const canEdit = selfStore.can(Permission.ImportPresencesEdit)

const apiUploadResponse: Ref<object|undefined> = ref(undefined);
const fileUploading = ref(false)

const memberPresenceQuery = new MemberPresenceQuery()
const externalPresenceQuery = new ExternalPresenceQuery()

async function importMemberPresences(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {created, error} = await memberPresenceQuery.importFromCsv(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  apiUploadResponse.value = created
  displayFileSuccessToast()
}

async function importExternalPresences(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {created, error} = await externalPresenceQuery.importFromCsv(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  apiUploadResponse.value = created
  displayFileSuccessToast()
}

</script>

<template>
  <ErrorModuleNotEnabled v-if="!selfStore.selectedProfile?.club.presencesEnabled" />
  <div v-else class="flex flex-col gap-4">
    <MetricAdminImportBatches />

    <UAlert
      icon="i-heroicons-megaphone"
      color="warning"
      title="Veuillez-vous assurer que tous les membres sont bien importés avant."
      description="L'import ne créera pas de nouveaux membres ni activités."
    />

    <UCard>
      <p>L'import ce fait grâce au fichier csv exporté depuis l'historique de présence.</p>
      <p>Celui-ci doit obligatoirement être au format csv.</p>
      <p>Une fois le fichier envoyé, l'import est effectué en tâche de fond et peux prendre un certain temps.</p>

      <div class="grid grid-cols-11 my-4">
        <div class="col-span-5 space-y-2">
          <p class="font-bold">Membres</p>
          <UInput
            :loading="fileUploading"
            :disabled="fileUploading || !canEdit"
            class="my-4"
            type="file"
            accept="text/csv"
            icon="i-heroicons-document-text"
            @change="importMemberPresences"
          />

          <p class="">Exemple</p>

          <GenericCode>
            member.licence,date,activities.0.name,activities.1.name <br >
            01234578,2018-08-03T00:00:00+00:00,50M - Toutes armes,Non existant <br >
            45678412,2018-08-03T00:00:00+00:00,25M, <br >
            45678412,2018-08-04T00:00:00+00:00,50M - Toutes armes, <br >
            45671134,2018-08-03T00:00:00+00:00,Bureau,
          </GenericCode>
        </div>

        <USeparator class="col-span-1" orientation="vertical" />

        <div class="col-span-5 space-y-2">
          <p class="font-bold">Présences externe</p>
          <UInput
            :loading="fileUploading"
            :disabled="fileUploading || !canEdit"
            class="my-4"
            type="file"
            accept="text/csv"
            icon="i-heroicons-document-text"
            @change="importExternalPresences"
          />

          <p class="">Exemple</p>

          <GenericCode>
            licence,firstname,lastname,date,activities.0.name,activities.1.name <br >
            01234578,Jean,NOM,2018-08-03T00:00:00+00:00,50M - Toutes armes,Non existant <br >
            ,Jean,NOM2,2018-08-03T00:00:00+00:00,25M, <br >
            ,Jean,NOM3,2018-08-04T00:00:00+00:00,50M - Toutes armes, <br >
            ,Jean,NOM4,2018-08-03T00:00:00+00:00,Bureau,
          </GenericCode>
        </div>
      </div>

      <GenericCode v-if="apiUploadResponse" class="mb-4">{{apiUploadResponse}}</GenericCode>

      <div class="flex gap-2">
        <UButton target="_blank" to="https://docs.narvik.app/frontend/docs/import/narvik-presences.html">Documentation</UButton>
        <div class="flex-1"/>
        <UButton v-if="selectedProfile?.club.settings.activity === ClubActivity.SPORT_FFTIR" variant="ghost" to="/admin/imports/cerbere">Import depuis cerbère</UButton>
      </div>

    </UCard>

  </div>
</template>
