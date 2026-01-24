<script setup lang="ts">
import type {PropType} from "vue";
import type {ExternalPresence} from "~/types/api/item/clubDependent/plugin/presence/externalPresence";
import RegisterExternalPresence from "~/components/ExternalPresence/RegisterExternalPresence.vue";
import ExternalPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/ExternalPresenceQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";


const props = defineProps({
  item: {
    type: Object as PropType<ExternalPresence>,
    required: true
  },
});

const emit = defineEmits([
  'updated',
  'close'
])

const popoverOpen = ref(false)

const selfStore = useSelfUserStore()
const isSupervisor = selfStore.hasSupervisorRole()
const isBadger = selfStore.isBadger()

const externalPresence: Ref<ExternalPresence> = ref(props.item)
const externalPresenceQuery = new ExternalPresenceQuery()

const updateExternalPresenceModalOpen = ref(false);

function presenceUpdated(newExternalPresence: ExternalPresence) {
  updateExternalPresenceModalOpen.value = false;
  externalPresence.value = newExternalPresence
  emit('updated', newExternalPresence)
}

function presenceCanceled(newExternalPresence: ExternalPresence) {
  updateExternalPresenceModalOpen.value = false;
  emit('close', false)
}

async function deletePresence() {
  if (isSupervisor || isBadger) {
    await externalPresenceQuery.delete(externalPresence.value)
    popoverOpen.value = false
    emit('updated', null)
  }
}

</script>

<template>
  <UCard class="bg-orange-50 dark:bg-orange-950">
    <div class="flex gap-2">
      <UButton
        icon="i-heroicons-x-circle"
        color="warning"
        variant="ghost"
        size="xs"
        @click="emit('close', false)"
      />

      <div class="flex-1"/>

      <UButton
          icon="i-heroicons-pencil-square"
          size="xs"
          color="warning"
          variant="solid"
          label="Editer"
          @click="updateExternalPresenceModalOpen = true"
      />

      <UTooltip v-if="isSupervisor || isBadger" text="Supprimer">
        <UPopover v-model:open="popoverOpen">
          <UButton
              icon="i-heroicons-trash"
              size="xs"
              color="error"
              variant="ghost"
          />

          <template #content>
            <div class="p-4 w-56 flex flex-col gap-4">
              <div class="text-center text-lg font-bold">Êtes-vous certain ?</div>

              <UButton
                  color="error"
                  class="mx-auto"
                  @click="deletePresence();"
              >
                Supprimer
              </UButton>
            </div>
          </template>
        </UPopover>
      </UTooltip>
    </div>

    <div class="space-y-4 w-full mt-4">
      <div class="text-center text-2xl font-bold">
        {{ externalPresence.fullName }}
      </div>
      <div class="flex items-center justify-center text-xl">
        <UIcon class="mr-2" name="i-heroicons-identification" />
        {{ externalPresence.licence }}
      </div>
      <div class="flex gap-4 justify-center flex-wrap">
        <UButton
            v-for="activity in externalPresence?.activities.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1))"
            color="warning"
        >
          {{ activity.name }}
        </UButton>
      </div>

    </div>
  </UCard>

  <UModal
      v-model:open="updateExternalPresenceModalOpen">
    <template #content>
      <div>
        <RegisterExternalPresence
          :external-presence="externalPresence"
          @registered="presenceUpdated"
          @canceled="presenceCanceled"
        />
      </div>
    </template>
  </UModal>
</template>

<style scoped lang="css">

</style>
