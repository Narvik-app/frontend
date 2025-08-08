<script setup lang="ts">
import type {Column} from "@tanstack/table-core";
import type {PropType} from "vue";
import type {Item} from "~/types/api/item";
import * as console from "node:console";

const props = defineProps({
  column: {
    type: Object as PropType<Column<Item>>,
    required: true
  },

  canBeUnsorted: {
    type: Boolean,
    default: false
  }
})

const icon = computed(() => {
  if (!props.column.getIsSorted()) return 'i-heroicons-arrows-up-down'
  if (props.column.getIsSorted() === 'asc') return 'i-heroicons-bars-arrow-down'
  return 'i-heroicons-bars-arrow-up'
})

function changeFilter() {
  if (!props.column.getIsSorted()) {
    props.column.toggleSorting(false, props.column.getCanMultiSort()) // Sort ASC first
    return
  }

  if (props.column.getIsSorted() === 'asc') {
    props.column.toggleSorting(true, props.column.getCanMultiSort()) // Sort DESC
    return
  }

  if (props.canBeUnsorted) {
    // Last case we disable the sorting
    props.column.clearSorting()
    return
  }

  // Fallback, we do the opposite
  props.column.toggleSorting(props.column.getNextSortingOrder(), props.column.getCanMultiSort())
}

</script>

<template>
  <UButton
    variant="ghost"
    color="neutral"
    :icon="icon"
    @click="changeFilter"
  >
    <slot>
      {{ props.column.columnDef.header }}
    </slot>
  </UButton>
</template>

<style scoped lang="css">

</style>
