<script setup lang="ts">
import type {PropType, Ref} from "vue";
import type {FormError, FormErrorEvent} from "#ui/types";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {Season} from "~/types/api/item/season";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import dayjs from "dayjs";

const props = defineProps({
  item: {
    type: Object as PropType<Member>,
    required: false,
  },
  seasons: {
    type: Object as PropType<Season[]>,
    required: false,
  },
  viewOnly: {
    type: Boolean,
    required: false,
    default: false
  }
})

const item: Ref<Member> = props.item ? ref(props.item) : ref(getDefaultItem())

watch(props, async value => {
  item.value = props.item ?? getDefaultItem()
})

const emit = defineEmits([
  'updated',
])

const isUpdating = ref(false)
const popoverOpen = ref(false)
const popoverMedicalOpen = ref(false)

const toast = useToast()
const memberQuery = new MemberQuery()

const memberAge = computed(() => {
  if (item.value.birthday) {
    return dayjs().diff(dayjs(item.value.birthday), 'year')
  }
  return 0
})

function getDefaultItem() {
  const item: Member = {
    uuid: undefined,
  }
  return item
}

// Form validation

const validate = (state: Member): FormError[] => {
  const errors = []

  if (!state.firstname) errors.push({ name: 'firstname', message: 'Champ requis' })
  if (!state.lastname) errors.push({ name: 'lastname', message: 'Champ requis' })

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
    const { created, error } = await memberQuery.post(item.value)
    if (created) {
      item.value = created
    }

    if (error) {
      errorMessage = error.message
    }
  } else {
    const { updated, error } = await memberQuery.patch(item.value, item.value)
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
    <div class="flex justify-between">
      <UFormField label="Genre" name="gender">
        <USelect class="min-w-32" v-model="item.gender" :items="[{label: 'Homme', value: 'M'}, {label: 'Femme', value: 'F'}]" option-attribute="name" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      </UFormField>

      <UFormField label="Newsletter">
        <USwitch v-model="item.clubNewsletter" :disabled="props.viewOnly" />
      </UFormField>

      <UFormField label="Blacklisté">
        <USwitch v-model="item.blacklisted" :disabled="props.viewOnly" />
      </UFormField>
    </div>

    <div class="flex justify-between">
      <UFormField label="Date de naissance" name="birthday">
        <UPopover v-model:open="popoverOpen">
          <UButton icon="i-heroicons-calendar-days-20-solid" :label="formatDateReadable(item.birthday?.toString()) || 'Choisir une date'" />

          <template #content>
            <div>
              <div class="p-2 text-xs text-center">
                <p>Vous pouvez cliquer sur l'année</p>
                <p>afin de changer celle-ci</p>
              </div>
              <GenericDatePicker class="!w-full" v-model="item.birthday" mode="date" @close="popoverOpen = false" />
            </div>
          </template>
        </UPopover>
      </UFormField>

      <UFormField label="Certificat médical" name="medicalCertificateExpiration">
        <UPopover v-model:open="popoverMedicalOpen">
          <UButton icon="i-heroicons-calendar-days-20-solid" :label="formatDateReadable(item.medicalCertificateExpiration?.toString()) || 'Choisir une date'" />

          <template #content>
            <div>
              <div class="p-2 text-xs text-center">
                <p>Date d'expiration du</p>
                <p>certificat médical</p>
              </div>
              <GenericDatePicker class="!w-full" v-model="item.medicalCertificateExpiration" mode="date" @close="popoverMedicalOpen = false" />
            </div>
          </template>
        </UPopover>
      </UFormField>
    </div>
    <UAlert v-if="memberAge < 18" icon="i-heroicons-exclamation-triangle" color="error" variant="subtle" title="Consentement recueil des données (RGPD)">
      <template #description>
        <p v-if="memberAge < 15">-15 ans, le consentement pour le recueil doit être effectué auprès des parents.</p>
        <p v-if="memberAge === 0 || memberAge >= 15">15-18 ans, le consentement pour le recueil doit être effectué auprès de l'enfant.</p>
      </template>
    </UAlert>

    <UFormField label="Licence" name="licence">
      <UInput v-model="item.licence" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <UFormField label="Nom" name="lastname" required>
      <UInput v-model="item.lastname" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <UFormField label="Prénom" name="firstname" required>
      <UInput v-model="item.firstname" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <UFormField label="Email" name="email">
      <UInput v-model="item.email" type="email" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <USeparator class="mt-4" label="Téléphone" />

    <div class="flex justify-between">
      <UFormField label="Fixe" name="phone">
        <UInput v-model="item.phone" type="tel" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      </UFormField>

      <UFormField label="Mobile" name="mobilePhone">
        <UInput v-model="item.mobilePhone" type="tel" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      </UFormField>
    </div>

    <USeparator class="mt-4" label="Adresse" />

    <UFormField label="Pays" name="country">
      <UInput v-model="item.country" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>

    <div class="flex justify-between">
      <UFormField label="Code postal" name="zipCode">
        <UInput v-model="item.zipCode" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      </UFormField>

      <UFormField label="Ville" name="city">
        <UInput v-model="item.city" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      </UFormField>
    </div>

    <UFormField label="Adresse" name="postal">
      <UInput v-model="item.postal1" placeholder="Adresse ligne 1" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      <UInput class="my-2" v-model="item.postal2" placeholder="Adresse ligne 2" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
      <UInput v-model="item.postal3" placeholder="Adresse ligne 3" :class="props.viewOnly ? 'pointer-events-none' : ''" :tabindex="props.viewOnly ? '-1' : '0'" />
    </UFormField>


    <UButton type="submit" v-if="!props.viewOnly"
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
