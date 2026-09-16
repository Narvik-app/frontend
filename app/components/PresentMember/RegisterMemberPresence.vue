<script setup lang="ts">
import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {PropType, Ref} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {FormSubmitEvent} from "#ui/types";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {formatDateInput} from "~/utils/date";
import {ClubRole, getAvailableClubRole, hasClubSupervisorRole, isClubAdmin} from "~/types/api/item/club";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";
import {DECLARATION_DESCRIPTION_MAX_LENGTH} from "~/utils/timeAndTravel";

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: false,
    default: undefined
  },
  memberPresence: {
    type: Object as PropType<MemberPresence>,
    required: false,
    default: undefined
  },
  dateEditable: {
    type: Boolean,
    required: false,
    default: false
  },
  /** Set to false to skip the post-registration time-and-travel declaration prompt (e.g. a badger/kiosk session) */
  promptDeclaration: {
    type: Boolean,
    required: false,
    default: true
  },
  /**
   * The kiosk/today-list page is often used under a shared badger session, so there's no
   * meaningful "acting user" to check permissions on — instead it prompts based on whether the
   * MEMBER BEING REGISTERED is themselves a supervisor/admin (e.g. badging themselves in).
   * Everywhere else (an admin deliberately adding a presence for someone from their member page),
   * it stays based on the acting user's own TIME_TRAVEL_EDIT permission.
   */
  promptBasedOnMemberRole: {
    type: Boolean,
    required: false,
    default: false
  }
});

const selfStore = useSelfUserStore()

const emit = defineEmits([
  'registered',
  'canceled',
  /** Emitted whenever the internal stage changes, so a wrapping modal can disable ESC/backdrop dismissal while the declaration step is shown. */
  'stage-change'
])

const toast = useToast()

const memberPresenceQuery = new MemberPresenceQuery();


const isLoading: Ref<boolean> = ref(true)
const isSubmitting: Ref<boolean> = ref(false)
const activities: Ref<Activity[]> = ref([])
const selectedDate: Ref<Date|null> = ref(null);

const state = reactive({
  member: props.member as Member|undefined,
  activities: {} as { [k: string]: boolean }
})

if (props.memberPresence) {
  state.member = props.memberPresence.member
  state.activities = {}
  if (props.memberPresence.date) {
    selectedDate.value = new Date(props.memberPresence.date)
  }
  props.memberPresence.activities?.forEach(actvt => {
    if (actvt["@id"]) {
      state.activities[actvt["@id"]] = true
    }
  });
}

const activityQuery = new ActivityQuery();
activityQuery.getAll().then(value => {
  isLoading.value = false;
  activities.value = value.items
      .filter((actvt) => actvt.isEnabled) // We don't display the disabled activities
      .sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))
});


const activitiesMember = computed(() => {
  return activities.value.filter((actvt) => actvt.isEnabled && (!actvt.visibility || actvt.visibility === ClubRole.Member))
})
const activitiesSupervisor = computed(() => {
  return activities.value.filter((actvt) => actvt.isEnabled && actvt.visibility === ClubRole.Supervisor)
})
const activitiesAdmin = computed(() => {
  return activities.value.filter((actvt) => actvt.isEnabled && actvt.visibility === ClubRole.Admin)
})

// Two-stage flow: after the presence is registered, prompt a time-and-travel
// declaration when a selected activity calls for it. Only on create (never
// when editing an existing presence), and only for whoever is allowed to
// declare — see promptBasedOnMemberRole above for the two ways that's checked.
const stage: Ref<'presence' | 'declaration'> = ref('presence')
const createdPresence: Ref<MemberPresence | undefined> = ref(undefined)

watch(stage, (value) => emit('stage-change', value))

const declarableSelectedActivities = computed(() => {
  return activities.value.filter((actvt) => actvt.promptTimeAndTravelDeclaration && actvt["@id"] && state.activities[actvt["@id"]])
})

// Activity names joined together can exceed the description limit — truncated upfront so the initial value isn't silently rejected by the backend.
const declarationInitialDescription = computed(() => {
  return declarableSelectedActivities.value.map((actvt) => actvt.name).join(', ').slice(0, DECLARATION_DESCRIPTION_MAX_LENGTH)
})

const shouldPromptDeclaration = computed(() => {
  if (!props.promptDeclaration || props.memberPresence) return false
  if (!selfStore.selectedProfile?.club.timeAndTravelEnabled) return false
  if (declarableSelectedActivities.value.length === 0) return false

  if (props.promptBasedOnMemberRole) {
    return hasClubSupervisorRole(state.member?.role)
  }

  return !selfStore.isBadger() && selfStore.can(Permission.TimeAndTravelEdit)
})


interface MemberPresenceFormState {
  member?: Member;
  activities: { [k: string]: boolean };
}

async function onSubmit(event: FormSubmitEvent<MemberPresenceFormState>) {
  isSubmitting.value = true;

  const memberPresence: { member: string|number|undefined, activities: string[], date: string|undefined } = {
    date: undefined,
    member: undefined,
    activities: []
  }
  if (props.member) {
    memberPresence.member = props.member["@id"]
  } else if (props.memberPresence) {
    delete memberPresence.member // We remove the member key since we only update the activities (PATCH request)
  }

  for (const [key, value] of Object.entries(event.data.activities)) {
    if (key && value) {
      memberPresence.activities.push(key)
    }
  }

  if (props.dateEditable && selectedDate.value) {
    const date = formatDateInput(selectedDate.value.toString())
    if (date) {
      memberPresence.date = date
    }
  }

  let item: MemberPresence | undefined = undefined;
  let error: Error | undefined = undefined;

  if (!props.memberPresence) {
    const { created, error: errorMessage } = await memberPresenceQuery.post(memberPresence);
    item = created
    error = errorMessage;
  } else {
    const { updated, error: errorMessage } = await memberPresenceQuery.patch(props.memberPresence, memberPresence);
    item = updated
    error = errorMessage;
  }

  isSubmitting.value = false;
  if (error) {
    toast.add({
      color: "error",
      title: "L'enregistrement a échoué",
      description: error.message
    });
    return;
  }

  toast.add({
    title: "Présence enregistrée"
  });

  if (shouldPromptDeclaration.value && item) {
    createdPresence.value = item
    stage.value = 'declaration'
    return
  }

  emit('registered', item)
}

function onDeclarationDone() {
  emit('registered', createdPresence.value)
}

</script>

<template>
  <UCard>
    <div v-if="isLoading || !state.member" class="h-full">
      <USkeleton class="h-8 w-36" />
      <USkeleton class="h-4 w-12 my-4" />

      <div class="grid grid-cols-2 gap-4">
        <div v-for="k in 11" :key="k" class="h-6 flex gap-4 basis-1/2 w-full">
          <USkeleton class="w-6" />
          <USkeleton class="w-full" />
        </div>
      </div>

      <USkeleton class="mt-4 h-6 w-full" />
    </div>

    <div v-else-if="stage === 'declaration'">
      <div class="text-2xl">Déclaration de temps &amp; kilomètres pour <b>{{ state.member.fullName }}</b></div>

      <TimeAndTravelDeclarationForm
        class="mt-4"
        :member="state.member"
        :initial-description="declarationInitialDescription"
        @updated="onDeclarationDone"
        @canceled="onDeclarationDone"
      />
    </div>

    <div v-else>
      <div class="text-2xl">Enregistrement pour <b>{{ state.member.fullName }}</b></div>

      <UForm :state="state" @submit="onSubmit">
        <GenericDatePickerField v-if="props.dateEditable" v-model="selectedDate" class="mt-4" placeholder="Choisir une date" />

        <div class="mt-4">Activités</div>
        <div class="my-4">
          <div class="grid grid-cols-2 gap-2 gap-y-2 ">
            <template v-for="activity in activitiesMember" :key="activity.uuid">
              <UCheckbox
                  v-if="activity['@id']"
                  v-model="state.activities[activity['@id']]"
                  class="w-full"
                  :value="activity"
                  :name="'actvt-' + activity.uuid"
                  :label="activity.name" />
            </template>


            <template v-if="activitiesSupervisor.length > 0 && hasClubSupervisorRole(state.member?.role)">
              <USeparator class="col-span-2" :label="getAvailableClubRole(ClubRole.Supervisor).text" />

              <template v-for="activitySupervisor in activitiesSupervisor" :key="activitySupervisor.uuid">
                <UCheckbox
                    v-if="activitySupervisor['@id']"
                    v-model="state.activities[activitySupervisor['@id']]"
                    class="w-full"
                    :value="activitySupervisor"
                    :name="'actvts-' + activitySupervisor.uuid"
                    :label="activitySupervisor.name" />
              </template>

            </template>

            <template v-if="activitiesAdmin.length > 0 && isClubAdmin(state.member?.role)">
              <USeparator class="col-span-2" :label="getAvailableClubRole(ClubRole.Admin).text" />

              <template v-for="activityAdmin in activitiesAdmin" :key="activityAdmin.uuid">
                <UCheckbox
                    v-if="activityAdmin['@id']"
                    v-model="state.activities[activityAdmin['@id']]"
                    class="w-full"
                    :value="activityAdmin"
                    :name="'actvta-' + activityAdmin.uuid"
                    :label="activityAdmin.name" />
              </template>
            </template>

          </div>
        </div>

        <UButton :loading="isSubmitting" block type="submit">
          Enregistrer
        </UButton>
        <UButton class="mt-2" color="error" :loading="isSubmitting" block @click="emit('canceled')">
          Annuler
        </UButton>
      </UForm>
    </div>
  </UCard>
</template>

<style scoped lang="css">

</style>
