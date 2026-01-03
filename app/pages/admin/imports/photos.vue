<script lang="ts" setup>
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {ClubActivity} from "~/types/api/item/club";
import {Permission} from "~/types/api/permissions";

definePageMeta({
  layout: "admin"
});

useHead({
  title: "Import des photos"
})

const selfStore = useSelfUserStore();
const { selectedProfile } = storeToRefs(selfStore)
const canEdit = selfStore.can(Permission.ImportPhotosEdit)

const memberQuery = new MemberQuery()

const fileUploading = ref(false)

async function getFileObject(event: any) {
  const formData = getFileFormDataFromUInputChangeEvent(event);

  if (!formData) {
    return;
  }

  fileUploading.value = true
  const {created, error} = await memberQuery.importPhotosFromItac(formData)
  fileUploading.value = false

  if (error) {
    return displayFileErrorToast(error.message)
  }

  displayFileSuccessToast()
}

</script>

<template>
  <div>
    <UCard>
      <p>L'archive importée doit obligatoirement être au format zip.</p>
      <p>Chaque photo doit être nommée avec le numéro de licence de la personne.</p>

      <UInput
          :loading="fileUploading"
          :disabled="fileUploading || !canEdit"
          class="my-4"
          type="file"
          accept="application/zip"
          icon="i-heroicons-archive-box"
          @change="getFileObject"
      />

      <UButton v-if="selectedProfile?.club.settings.activity === ClubActivity.SPORT_FFTIR" target="_blank" to="https://docs.narvik.app/frontend/docs/import/fftir-itac.html#import-des-photos">Documentation</UButton>

    </UCard>
  </div>
</template>
