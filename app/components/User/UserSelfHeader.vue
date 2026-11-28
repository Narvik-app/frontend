<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {User} from "~/types/api/item/user";
import type {ExposedFile} from "~/types/api/item/exposedFile";
import FileQuery from "~/composables/api/query/FileQuery";
import MemberProfileImageModal from "~/components/Member/MemberProfileImageModal.vue";
import ModalSelectProfile from "~/components/Modal/ModalSelectProfile.vue";
import {useSelfUserStore} from "~/stores/useSelfUser";

/**
 * Identity of the logged user: the club member file when there is one (photo, licence, season), else the account.
 */
const props = defineProps({
  user: {
    type: Object as PropType<User>,
    required: true
  },
  member: {
    type: Object as PropType<Member>,
    default: undefined
  },
  clubName: {
    type: String,
    default: undefined
  }
})

const overlay = useOverlay()
const selfStore = useSelfUserStore()
const fileQuery = new FileQuery()

const profileImage = ref<ExposedFile | undefined>(undefined)
const fullName = computed(() => props.member?.fullName ?? props.user.fullName)
const canChangeProfile = computed(() => (props.user.linkedProfiles?.length ?? 0) > 1)
const seasonName = computed(() => props.member?.currentSeason?.season?.name)

watch(() => props.member?.profileImage?.privateUrl, async (url) => {
  profileImage.value = url ? (await fileQuery.getFromUrl(url)).retrieved : undefined
}, { immediate: true })

function openProfileImageModal() {
  if (!props.member) return
  overlay.create(MemberProfileImageModal).open({
    member: props.member,
    onUpdated() {
      selfStore.refresh()
    }
  })
}
</script>

<template>
  <UCard data-testid="self-header">
    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-4">
      <div class="relative size-20 shrink-0 group">
        <UAvatar class="size-full" size="3xl" :src="profileImage?.base64" :alt="fullName" />
        <button
          v-if="props.member"
          class="absolute inset-0 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition cursor-pointer flex items-center justify-center text-xs text-center px-2"
          @click="openProfileImageModal"
        >
          Changer la photo
        </button>
      </div>

      <div class="flex-1 min-w-0 flex flex-col items-center sm:items-start gap-1 text-center sm:text-left">
        <div class="text-2xl font-bold">{{ fullName }}</div>
        <div class="text-sm text-muted break-all">
          {{ props.user.email }}<template v-if="props.clubName"> · {{ props.clubName }}</template>
        </div>

        <div v-if="props.member" class="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
          <MemberLicence :member="props.member" :copyable="true" :icon="true" size="sm" />
          <UBadge
            v-if="props.member.currentSeason"
            color="success"
            variant="subtle"
            icon="i-heroicons-check-circle"
          >
            {{ seasonName ? `Saison ${seasonName} à jour` : 'Saison à jour' }}
          </UBadge>
          <UBadge v-else color="error" variant="subtle" icon="i-heroicons-exclamation-triangle">
            Saison non renouvelée
          </UBadge>
          <UBadge v-if="props.member.currentSeason?.ageCategory" color="neutral" variant="subtle">
            {{ props.member.currentSeason.ageCategory.name }}
          </UBadge>
        </div>
      </div>

      <UButton
        v-if="canChangeProfile"
        color="neutral"
        variant="outline"
        icon="i-heroicons-arrows-right-left"
        @click="overlay.create(ModalSelectProfile).open()"
      >
        Changer de profil
      </UButton>
    </div>
  </UCard>
</template>
