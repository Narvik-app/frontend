<script setup lang="ts">
import type {PropType, Ref} from "vue";
import type {FormError, FormErrorEvent} from "#ui/types";
import type {Member} from "~/types/api/item/clubDependent/member";
import {type User, UserRole} from "~/types/api/item/user";
import UserQuery from "~/composables/api/query/UserQuery";

const props = defineProps({
  item: {
    type: Object as PropType<User>,
    required: false,
  },
  isList: {
    type: Boolean,
    required: false,
    default: false
  }
})

const item: Ref<User> = props.item ? ref(props.item) : ref(getDefaultItem())

watch(props, async (_value) => {
  item.value = props.item ?? getDefaultItem()
})

const emit = defineEmits([
  'updated',
])

const isUpdating = ref(false)

const toast = useToast()
const userQuery = new UserQuery()

function getDefaultItem() {
  const item: User = {
    uuid: undefined,
    email: ''
  }
  return item
}

// Form validation

const validate = (state: Member): FormError[] => {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Champ requis' })
  return errors
}

async function onError(event: FormErrorEvent) {
  const element = document.getElementById(event.errors[0].id)
  element?.focus()
  element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// Api Query

async function submitItem() {
  isUpdating.value = true
  const isCreate = !item.value.uuid

  let errorMessage = null
  if (isCreate) {
    const { created, error } = await userQuery.post(item.value)
    if (created) {
      item.value = created
    }

    if (error) {
      errorMessage = error.message
    }
  } else {
    const { updated, error } = await userQuery.patch(item.value, item.value)
    if (updated) {
      item.value = updated
    }
    if (error) {
      errorMessage = error.message
    }
  }

  isUpdating.value = false

  if (errorMessage) {
    toast.add({
      title: "Une erreur est survenue",
      description: errorMessage,
      color: "error"
    })
    return
  }

  emit('updated', item.value)
}

</script>

<template>
  <UForm class="flex gap-2 flex-col" :state="item" :validate="validate" @submit="submitItem" @error="onError">
    <div class="flex gap-2 flex-col">
      <UFormField v-if="item.role !== UserRole.SuperAdmin" label="Activé" name="accountActivated">
        <USwitch v-model="item.accountActivated" :class="props.isList && item.uuid ? 'pointer-events-none' : ''" :tabindex="props.isList && item.uuid ? '-1' : '0'" />
      </UFormField>
      <UFormField label="Rôle" name="role">
        <USelect
          v-model="item.role"
          :items="Object.values(UserRole).slice(0, -1)"
          placeholder="Aucun rôle de défini"
          :class="props.isList && item.uuid ? 'pointer-events-none' : ''" :tabindex="props.isList && item.uuid ? '-1' : '0'"
        />
      </UFormField>
      <UFormField label="Email" name="email" required>
        <UInput v-model="item.email" type="email" :class="props.isList && item.uuid ? 'pointer-events-none' : ''" :tabindex="props.isList && item.uuid ? '-1' : '0'" />
      </UFormField>
      <UFormField label="Nom" name="lastname">
        <UInput v-model="item.lastname" :class="props.isList && item.uuid ? 'pointer-events-none' : ''" :tabindex="props.isList && item.uuid ? '-1' : '0'" />
      </UFormField>
      <UFormField label="Prénom" name="firstname">
        <UInput v-model="item.firstname" :class="props.isList && item.uuid ? 'pointer-events-none' : ''" :tabindex="props.isList && item.uuid ? '-1' : '0'" />
      </UFormField>

      <UFormField v-if="item.legalsAccepted" label="Legals accepté le">
        <p class="text-sm">{{ formatDateTimeReadable(item.legalsAccepted?.toString()) }}</p>
      </UFormField>
      <GenericItemTimestampInfo :item="item" />
    </div>


    <UButton
        v-if="!props.isList || !item.uuid" type="submit"
        block
        class="mt-2"
        :loading="isUpdating"
    >
      <template v-if="item.uuid">
        Modifier
      </template>
      <template v-else>
        Créer
      </template>
    </UButton>
  </UForm>
</template>

<style scoped lang="css">

</style>
