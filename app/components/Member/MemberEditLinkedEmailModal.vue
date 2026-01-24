<script setup lang="ts">

import type {PropType} from "vue";
import type {FormError} from "#ui/types";
import type {Member} from "~/types/api/item/clubDependent/member";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";

const props = defineProps(
  {
    member: {
      type: Object as PropType<Member>,
      required: true
    }
  }
)

const emit = defineEmits(['updated', 'close'])

const toast = useToast()

const _overlay = useOverlay()

const isLoading = ref(false)

const memberQuery = new MemberQuery()
const memberCopy: Member = {...props.member}

const validate = (_state: { linkedEmail?: string }): FormError[] => {
  const errors = []
  if (!memberCopy.linkedEmail) errors.push({ name: 'email', message: 'Champ requis' })
  return errors
}

async function updateLink() {
  if (!memberCopy.linkedEmail) return;

  isLoading.value = true
  const { updated, error } = await memberQuery.linkWithUser(memberCopy, memberCopy.linkedEmail)
  isLoading.value = false

  if (error || !updated) {
    toast.add({
      color: "error",
      title: "L'enregistrement a échoué",
      description: error?.message
    });
    return;
  }

  toast.add({
    color: "success",
    title: "Liaison modifiée"
  });

  emit('updated')
  emit('close', true)
}

</script>

<template>
  <ModalWithActions title="Changement du compte lié" @close="(state: boolean) => emit('close', state)">

    <UForm class="flex gap-2 flex-col" :state="memberCopy" :validate="validate">

      <UFormField label="Adresse mail du compte" name="email">
        <UInput v-model="memberCopy.linkedEmail" placeholder="Email" />
      </UFormField>
    </UForm>

    <template #actions>
      <UButton
        :loading="isLoading"
        @click="updateLink()"
      >
        Modifier
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
