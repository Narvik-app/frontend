<script setup lang="ts">
  import type { PropType } from 'vue';
  import FileQuery from '~/composables/api/query/FileQuery';
  import type { Member } from '~/types/api/item/clubDependent/member';
  import type { ExposedFile } from '~/types/api/item/exposedFile';

  const props = defineProps({
    member: {
      type: Object as PropType<Member>,
      required: true
    },
    clickable: {
      default: false
    }
  })

  const emit = defineEmits(['clicked'])

  const member: Ref<Member | undefined> = ref(undefined)
  const memberProfileImage: Ref<ExposedFile | undefined> = ref(undefined)
  const isHovered = ref(false)

  const fileQuery = new FileQuery()

  function handleClick() {
    if (props.clickable) {
      emit('clicked', member.value)
    }
  }

  function load() {
    if (props.member) {
      member.value = props.member

      if (member.value.profileImage?.privateUrl) {
        fileQuery.getFromUrl(member.value.profileImage.privateUrl).then(imageResponse => {
          memberProfileImage.value = imageResponse.retrieved
        })
      }
    }
  }

  load()
</script>

<template>
  <div
    class="flex-row gap-1 items-center border-primary border-2 rounded-2xl inline-flex pr-1 select-none"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="handleClick"
  >
    <UAvatar
      size="sm"
      :src="memberProfileImage?.base64"
      :alt="member?.fullName"
      :icon="(props.clickable && isHovered) ? 'i-heroicons-x-mark' : undefined"
    />
    <p class="text-sm">{{ member?.fullName }}</p>
  </div>
</template>
