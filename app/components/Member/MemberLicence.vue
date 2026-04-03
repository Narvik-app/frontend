<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: false,
    default: undefined
  },
  licence: {
    type: String,
    required: false,
    default: undefined
  },
  size: {
    type: String,
    default: 'md'
  },
  icon: {
    type: Boolean,
    default: false
  },
  copyable: {
    type: Boolean,
    default: false
  }
})

const toast = useToast()

const licenceValue = computed(() => props.licence ?? props.member?.licence)
const hasLicence = computed(() => Boolean(licenceValue.value))
const isSecondaryClubMember = computed(() => Boolean(props.member?.currentSeason?.isSecondaryClub))
const badgeColor = computed(() => isSecondaryClubMember.value ? 'warning' : 'neutral')
const badgeVariant = computed(() => isSecondaryClubMember.value ? 'outline' : 'soft')
const badgeIcon = computed(() => props.icon ? 'i-heroicons-identification' : '')

async function copyToClipboard(event?: Event) {
  if (!props.copyable || !licenceValue.value) {
    return
  }

  event?.preventDefault()
  event?.stopPropagation()

  if (!import.meta.client || !navigator.clipboard) {
    return
  }

  await navigator.clipboard.writeText(licenceValue.value)
  toast.add({
    title: 'Licence copiée'
  })
}
</script>

<template>
  <UButton
    v-if="props.copyable && hasLicence"
    :size="props.size"
    :color="badgeColor"
    :variant="badgeVariant"
    :icon="badgeIcon"
    class="cursor-copy"
    @click="copyToClipboard"
  >
    {{ licenceValue }}
  </UButton>

  <UBadge
    v-else
    :size="props.size"
    :color="badgeColor"
    :variant="badgeVariant"
    :icon="badgeIcon"

  >
    {{ licenceValue || '-' }}
  </UBadge>
</template>
