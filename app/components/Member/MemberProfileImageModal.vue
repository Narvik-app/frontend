<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {ExposedFile} from "~/types/api/item/exposedFile";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import FileQuery from "~/composables/api/query/FileQuery";
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true
  }
})

const emit = defineEmits(['updated', 'close'])

const isLoading = ref(false)
const currentImage: Ref<ExposedFile | undefined> = ref(undefined)
const selectedFormData: Ref<FormData | null> = ref(null)

const memberQuery = new MemberQuery()
const fileQuery = new FileQuery()

if (props.member.profileImage?.privateUrl) {
  fileQuery.getFromUrl(props.member.profileImage.privateUrl).then(r => {
    currentImage.value = r.retrieved
  })
}

function onFileChange(event: Event) {
  selectedFormData.value = getFileFormDataFromUInputChangeEvent(event)
}

async function uploadPhoto() {
  if (!selectedFormData.value) return

  isLoading.value = true
  const { error } = await memberQuery.updateProfileImage(props.member, selectedFormData.value)
  isLoading.value = false

  if (error) {
    displayFileErrorToast(error.message)
    return
  }

  displayFileSuccessToast('Photo mise à jour')
  emit('updated')
  emit('close', true)
}

async function removePhoto() {
  isLoading.value = true
  const { error } = await memberQuery.updateProfileImage(props.member, null)
  isLoading.value = false

  if (error) {
    displayFileErrorToast(error.message)
    return
  }

  displayFileSuccessToast('Photo supprimée')
  emit('updated')
  emit('close', true)
}
</script>

<template>
  <ModalWithActions title="Photo de profil" @close="(state: boolean) => emit('close', state)" :display-cancel-button="false">

    <div class="flex flex-col gap-4 items-center">
      <div class="h-24 w-24 aspect-square">
        <UAvatar
          class="w-full h-full"
          size="3xl"
          :src="currentImage?.base64"
          :alt="props.member.fullName"
        />
      </div>

      <UInput
        type="file"
        accept="image/png,image/jpeg,image/webp"
        @change="onFileChange"
      />
    </div>

    <template #actions>
      <UButton
        v-if="props.member.profileImage"
        color="error"
        variant="soft"
        :loading="isLoading"
        @click="removePhoto"
      >
        Supprimer la photo
      </UButton>

      <UButton
        :disabled="!selectedFormData"
        :loading="isLoading"
        @click="uploadPhoto"
      >
        Enregistrer
      </UButton>
    </template>
  </ModalWithActions>
</template>
