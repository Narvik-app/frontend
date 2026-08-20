<script lang="ts" setup>
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {formatDateReadable} from "~/utils/date";
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import {useSelfUserStore} from "~/stores/useSelfUser";
import dayjs from "dayjs";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {ClubActivity} from "~/types/api/item/club";
import {Permission} from "~/types/api/permissions";
import ClubJobQuery from "~/composables/api/query/clubDependent/ClubJobQuery";
import type {ClubJob, ClubJobKey} from "~/types/api/item/clubDependent/clubJob";

definePageMeta({
  layout: "admin"
});

useHead({
  title: "Import membres"
})

const selfStore = useSelfUserStore()
const { selectedProfile } = storeToRefs(selfStore)
const canEdit = selfStore.can(Permission.ImportMembersEdit)

const toast = useToast()

const fileUploading = ref(false)

const memberQuery = new MemberQuery()
const memberPresenceQuery = new MemberPresenceQuery()
const clubJobQuery = new ClubJobQuery()

const jobs: Ref<ClubJob[]> = ref([])
async function refreshJobs() {
  const {items} = await clubJobQuery.getAll()
  jobs.value = items
}
refreshJobs()

function jobFor(key: ClubJobKey): ClubJob | undefined {
  return jobs.value.find(j => j.key === key)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Type the event parameter properly
async function importFromItac(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {error} = await memberQuery.importFromItac(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  displayFileSuccessToast()
  refreshJobs()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Type the event parameter properly
async function importFromItacSecondary(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {error} = await memberQuery.importFromItacSecondary(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  refreshJobs()
  displayFileSuccessToast();
}

async function migrateExternal() {
  const { error } = await memberPresenceQuery.importFromExternalPresences()

  if (error) {
    toast.add({
      title: "Erreur lors de la migration",
      description: error.message,
      color: "error"
    })
    return
  }

  refreshJobs()

  toast.add({
    title: "Présences migrées",
    color: "success"
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Type the event parameter properly
async function importFromEden(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {error} = await memberQuery.importFromEden(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  displayFileSuccessToast();
}
</script>

<template>
  <div class="flex flex-col gap-4">

    <MetricAdminImportBatches />

    <template v-if="selectedProfile?.club.settings.activity === ClubActivity.SPORT_FFTIR">
      <UCard>
        <p>L'import doit être structuré au format itac.</p>
        <p>Celui-ci doit obligatoirement être au format csv.</p>

        <div class="grid grid-cols-11 my-4">
          <div class="col-span-5 space-y-4">
            <p class="font-bold">Club principal</p>
            <UAlert
              v-if="jobFor('import_itac')?.updatedAt"
              variant="soft"
              :title="'Dernier import effectué le ' + formatDateReadable(jobFor('import_itac')!.updatedAt)"
              :color="dayjs(jobFor('import_itac')!.updatedAt).isBefore(dayjs().subtract(1, 'months')) ? 'error' : 'success' "
            />
            <UAlert
              v-else
              title="Aucun import effectué"
              color="error"
            />

            <UInput
              :loading="fileUploading"
              :disabled="fileUploading || !canEdit"
              type="file"
              accept=".csv, text/csv, application/vnd.ms-excel"
              icon="i-heroicons-document-text"
              @change="importFromItac"
            />
          </div>

          <USeparator class="col-span-1" orientation="vertical" />

          <div class="col-span-5 space-y-4">
            <p class="font-bold">Club secondaire</p>
            <UAlert
              v-if="jobFor('import_itac_secondary')?.updatedAt"
              variant="soft"
              :title="'Dernier import effectué le ' + formatDateReadable(jobFor('import_itac_secondary')!.updatedAt)"
              :color="dayjs(jobFor('import_itac_secondary')!.updatedAt).isBefore(dayjs().subtract(1, 'months')) ? 'error' : 'success' "
            />
            <UAlert
              v-else
              title="Aucun import effectué"
              color="error"
            />

            <UInput
              :loading="fileUploading"
              :disabled="fileUploading || !canEdit"
              type="file"
              accept=".csv, text/csv, application/vnd.ms-excel"
              icon="i-heroicons-document-text"
              @change="importFromItacSecondary"
            />
          </div>
        </div>

        <div class="flex gap-2">
          <UButton target="_blank" to="https://docs.narvik.app/frontend/docs/import/fftir-itac.html#import-des-membres">Documentation</UButton>
          <div class="flex-1"/>
          <UButton variant="ghost" color="success" :disabled="!canEdit || jobFor('import_itac_secondary')?.status === 'in_progress'" @click="migrateExternal()">Migration présence externe vers présence membres</UButton>
        </div>

      </UCard>

      <GenericCard title="Certificats médicaux">
        <p>Pour le moment itac n'exporte pas la date de validité du certificat médical.</p>
        <p>Pour ce faire vous devais télécharger le fichier excel fourni par eden.</p>

        <UInput
          class="my-2"
          :loading="fileUploading"
          :disabled="fileUploading || !canEdit"
          type="file"
          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          icon="i-heroicons-document-text"
          @change="importFromEden"
        />

        <p class="my-2">Exemple</p>

        <GenericCode>
          N° licence | Date d'expiration <br >
          01234578 | 11.11.2024
        </GenericCode>

        <div class="flex gap-2 mt-4">
          <UButton target="_blank" to="https://docs.narvik.app/frontend/docs/import/fftir-itac.html#import-des-certificats-medicaux">Documentation</UButton>
          <div class="flex-1"/>
        </div>
      </GenericCard>
    </template>

    <template v-else>
      <UCard>
        <div class="text-center font-bold text-lg">Fonctionnalité à venir</div>
      </UCard>
    </template>

  </div>
</template>
