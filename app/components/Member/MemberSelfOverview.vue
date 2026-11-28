<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberSeason} from "~/types/api/item/clubDependent/memberSeason";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import type {MemberControlType} from "~/types/api/item/clubDependent/memberControlType";
import {memberControlTypeIsLifetime} from "~/types/api/item/clubDependent/memberControlType";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";
import MemberControlTypeQuery from "~/composables/api/query/clubDependent/MemberControlTypeQuery";
import {formatDate, formatDateReadable, formatTimeReadable} from "~/utils/date";
import {memberControlColor} from "~/utils/memberControl";

/**
 * Read-only view of the logged user's own member file: details, seasons and presences.
 * The club manages the data, the admin view is MemberDetails.
 */
const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true
  }
})

const RECENT_PRESENCES = 5

const memberQuery = new MemberQuery()
const memberControlTypeQuery = new MemberControlTypeQuery()

const seasons = ref<MemberSeason[]>([])
const presences = ref<MemberPresence[]>([])
const controlTypes = ref<MemberControlType[]>([])
const isLoadingPresences = ref(true)
const showAllPresences = ref(false)

const notSet = 'Non renseigné'
const formatPhone = (phone?: string) => phone?.match(/.{1,2}/g)?.join(' ')

const address = computed(() => {
  const m = props.member
  const lines = [m.postal1, m.postal2, m.postal3, [m.zipCode, m.city].filter(Boolean).join(' '), m.country]
  return lines.filter(Boolean) as string[]
})

const displayedControlTypes = computed(() => controlTypes.value.filter(t => t.displayOnPresenceCard))
const controlForType = (type: MemberControlType) => props.member.controls?.find(c => c.type?.uuid === type.uuid)

// Presences of the last 12 months, by activity (most practiced first)
const activityCounts = computed(() => {
  const counts = new Map<string, number>()
  presences.value.forEach(presence => presence.activities?.forEach(activity => {
    counts.set(activity.name, (counts.get(activity.name) ?? 0) + 1)
  }))
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
})
const maxActivityCount = computed(() => Math.max(1, ...activityCounts.value.map(a => a.count)))
const displayedPresences = computed(() => showAllPresences.value ? presences.value : presences.value.slice(0, RECENT_PRESENCES))

async function load() {
  if (!props.member.uuid) return
  const uuid = props.member.uuid

  const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10)
  const [seasonsResponse, presencesResponse, controlTypesResponse] = await Promise.all([
    memberQuery.seasons(uuid),
    memberQuery.presences(uuid, new URLSearchParams({ 'order[date]': 'desc', 'date[after]': lastYear })),
    memberControlTypeQuery.getAll(new URLSearchParams({ 'order[weight]': 'ASC' })),
  ])

  seasons.value = seasonsResponse.items
  presences.value = presencesResponse.items
  controlTypes.value = controlTypesResponse.items
  isLoadingPresences.value = false
}

watch(() => props.member.uuid, load, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard data-testid="self-membership">
      <div class="text-xl font-bold mb-2">Mon adhésion</div>

      <dl class="divide-y divide-default text-sm">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted">Téléphone</dt>
          <dd class="sm:col-span-2">
            <ULink v-if="props.member.phone" :to="'tel:' + props.member.phone" class="text-primary">{{ formatPhone(props.member.phone) }}</ULink>
            <span v-else class="text-dimmed">{{ notSet }}</span>
          </dd>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted">Mobile</dt>
          <dd class="sm:col-span-2">
            <ULink v-if="props.member.mobilePhone" :to="'tel:' + props.member.mobilePhone" class="text-primary">{{ formatPhone(props.member.mobilePhone) }}</ULink>
            <span v-else class="text-dimmed">{{ notSet }}</span>
          </dd>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted">Adresse</dt>
          <dd class="sm:col-span-2">
            <template v-if="address.length">
              <div v-for="(line, index) in address" :key="index">{{ line }}</div>
            </template>
            <span v-else class="text-dimmed">{{ notSet }}</span>
          </dd>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted">Newsletter du club</dt>
          <dd class="sm:col-span-2">{{ props.member.clubNewsletter ? 'Acceptée' : 'Refusée' }}</dd>
        </div>
        <div v-if="props.member.medicalCertificateExpiration" class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted">Certificat médical</dt>
          <dd class="sm:col-span-2">
            <UBadge
              variant="subtle"
              :color="props.member.medicalCertificateStatus === 'expired' ? 'error' : props.member.medicalCertificateStatus === 'valid' ? 'neutral' : 'warning'"
            >
              Jusqu'au {{ formatDateReadable(props.member.medicalCertificateExpiration.toString()) }}
            </UBadge>
          </dd>
        </div>
        <div v-for="type in displayedControlTypes" :key="type.uuid" class="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
          <dt class="text-muted flex items-center gap-1">
            <UIcon v-if="type.icon" :name="'i-heroicons-' + type.icon" />
            {{ type.name }}
          </dt>
          <dd class="sm:col-span-2">
            <UBadge v-if="memberControlTypeIsLifetime(type)" variant="subtle" :color="controlForType(type)?.date ? 'success' : 'neutral'">
              {{ controlForType(type)?.date ? 'Validé' : 'Non validé' }}
            </UBadge>
            <UBadge v-else-if="controlForType(type)?.date" variant="subtle" :color="memberControlColor(controlForType(type)!)">
              {{ formatDateReadable(controlForType(type)!.date!) }}
            </UBadge>
            <span v-else class="text-dimmed">Aucun enregistrement</span>
          </dd>
        </div>
      </dl>

      <p class="flex items-center gap-1 text-xs text-muted mt-3">
        <UIcon name="i-heroicons-information-circle" class="shrink-0" />
        Une information à corriger ? Contactez votre club.
      </p>
    </UCard>

    <UCard v-if="seasons.length">
      <div class="text-xl font-bold mb-2">Mes saisons</div>
      <ul class="flex flex-wrap gap-2">
        <li v-for="memberSeason in seasons" :key="memberSeason.uuid">
          <UBadge color="neutral" variant="soft" size="lg">
            {{ memberSeason.season?.name }}
            <template v-if="memberSeason.ageCategory"> · {{ memberSeason.ageCategory.name }}</template>
            <template v-if="memberSeason.isSecondaryClub"> · club secondaire</template>
          </UBadge>
        </li>
      </ul>
    </UCard>

    <UCard data-testid="self-presences">
      <div class="text-xl font-bold mb-2">Mes présences</div>

      <div v-if="isLoadingPresences" class="flex justify-center py-4">
        <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
      </div>

      <p v-else-if="presences.length === 0" class="text-sm text-muted">Aucune présence ces 12 derniers mois.</p>

      <template v-else>
        <p class="text-sm mb-3">
          <span class="font-semibold">{{ presences.length }} présence{{ presences.length > 1 ? 's' : '' }}</span> ces 12 derniers mois
          <span class="text-muted"> · Dernière le {{ formatDateReadable(presences[0]!.date) }}</span>
        </p>

        <ul v-if="activityCounts.length" class="flex flex-col gap-1.5 mb-4">
          <li v-for="activity in activityCounts" :key="activity.name" class="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-2 text-sm">
            <span class="truncate">{{ activity.name }}</span>
            <div class="h-2 rounded-full bg-elevated overflow-hidden">
              <div class="h-full rounded-full bg-primary" :style="{ width: `${(activity.count / maxActivityCount) * 100}%` }" />
            </div>
            <span class="text-muted tabular-nums">{{ activity.count }}</span>
          </li>
        </ul>

        <ul class="divide-y divide-default">
          <li v-for="presence in displayedPresences" :key="presence.uuid" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 text-sm">
            <span class="text-muted shrink-0 sm:w-36">{{ formatDate(presence.date) }} à {{ formatTimeReadable(presence.createdAt) }}</span>
            <span v-if="!presence.activities?.length" class="italic text-dimmed">Aucune activité déclarée</span>
            <div v-else class="flex flex-wrap gap-1">
              <UBadge v-for="activity in presence.activities" :key="activity.uuid" variant="soft">{{ activity.name }}</UBadge>
            </div>
          </li>
        </ul>

        <UButton
          v-if="presences.length > RECENT_PRESENCES"
          variant="link"
          class="mt-2 px-0"
          @click="showAllPresences = !showAllPresences"
        >
          {{ showAllPresences ? 'Voir moins' : `Voir les ${presences.length} présences` }}
        </UButton>
      </template>
    </UCard>
  </div>
</template>
