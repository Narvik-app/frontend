<script setup lang="ts">
import ActivityQuery from "~/composables/api/query/clubDependent/plugin/presence/ActivityQuery";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {PropType, Ref} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {FormSubmitEvent} from "#ui/types";
import type {MemberPresence} from "~/types/api/item/clubDependent/plugin/presence/memberPresence";
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import {formatDateInput, formatDateReadable} from "~/utils/date";
import {ClubRole, getAvailableClubRole, hasClubSupervisorRole, isClubAdmin} from "~/types/api/item/club";

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: false
  },
  memberPresence: {
    type: Object as PropType<MemberPresence>,
    required: false
  },
  dateEditable: {
    type: Boolean,
    required: false,
    default: false
  }
});

const emit = defineEmits([
  'registered',
  'canceled'
])

const toast = useToast()
const popoverOpen = ref(false)

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


async function onSubmit(event: FormSubmitEvent<any>) {
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

  emit('registered', item)
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

    <div v-else>
      <div class="text-2xl">Enregistrement pour <b>{{ state.member.fullName }}</b></div>

      <UForm :state="state" @submit="onSubmit">
        <UPopover
v-if="props.dateEditable"
                  v-model:open="popoverOpen"
                  class="mt-4">
          <UButton icon="i-heroicons-calendar-days-20-solid" :label="formatDateReadable(selectedDate?.toString()) || 'Choisir une date'" />

          <template #content>
            <GenericDatePicker v-model="selectedDate" @close="popoverOpen = false" />
          </template>
        </UPopover>

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
