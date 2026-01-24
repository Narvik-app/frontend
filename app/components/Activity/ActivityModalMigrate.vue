<script setup lang="ts">

import type {PropType} from "vue";
import type {Activity} from "~/types/api/item/clubDependent/plugin/presence/activity";
import type {SelectApiItem} from "~/types/select";

const props = defineProps(
  {
    title: {
      type: String,
      required: true
    },
    activities: {
      type: Object as PropType<Activity[]>,
      required: true
    }
  }
)

const emit = defineEmits(['migrate', 'close'])

const migrationTarget: Ref<string|undefined> = ref(undefined)

const items = computed( () => {
  const items: SelectApiItem<Activity>[] = []
  props.activities?.forEach(value => {
    items.push({
      label: value.name,
      value: value.uuid,
      item: value
    })
  })
  return items;
})

</script>

<template>
  <ModalWithActions :title="props.title" @close="(state: boolean) => emit('close', state)">

    <UAlert
      class="my-4"
      color="error"
      variant="soft"
      title="Une fois la migration effectuée, l'activité sera supprimée."
    />

    <UFormField class="mb-4" label="Activité cible">
      <USelect v-model="migrationTarget" required :items="items" />
    </UFormField>

    <template #actions>
      <UButton
        :disabled="!migrationTarget"
        @click="emit('migrate', migrationTarget); emit('close', true)"
      >
        Migrer
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
