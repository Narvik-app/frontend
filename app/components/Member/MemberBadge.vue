<script setup lang="ts">
  import type { PropType } from 'vue';
  import FileQuery from '~/composables/api/query/FileQuery';
  import type { Member } from '~/types/api/item/clubDependent/member';
  import type { ExposedFile } from '~/types/api/item/exposedFile';

  const props = defineProps({
    member: {
      type: Object as PropType<Member>,
      required: true
    }
  })

  const member: Ref<Member | undefined> = ref(undefined)
  const memberProfileImage: Ref<ExposedFile | undefined> = ref(undefined)

  const fileQuery = new FileQuery()

  load()
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
</script>

<template>
  <div class="flex-row gap-1 items-center border-primary border-2 rounded-2xl inline-flex pr-1">
    <UAvatar
      size="sm"
      :src="memberProfileImage?.base64"
      :alt="member?.fullName"
    />
    <p class="text-sm">{{ member?.fullName }}</p>
  </div>
</template>