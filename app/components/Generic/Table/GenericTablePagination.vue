<script setup lang="ts">
import {usePaginationValues} from "~/composables/api/list";
import type {TablePaginateInterface} from "~/types/table";

const props = defineProps({
  totalItems: {
    type: Number,
    default: 0
  },
})

const emit = defineEmits<{
  paginate: [TablePaginateInterface],
}>()

// 2 ways binding
const page = defineModel<number>("page", { default: 1, required: true })
const itemsPerPage = defineModel<number>("itemsPerPage", { default: 30, required: true })

function emitPaginate(pagination: TablePaginateInterface) {
  emit('paginate', pagination)
}

</script>

<template>

  <div class="flex flex-wrap justify-end gap-4 px-3 py-3.5 pr-0 border-t border-neutral-200 dark:border-neutral-700">
    <USelect v-model="itemsPerPage" class="w-fit" :items="usePaginationValues" @update:model-value="(payload) => emitPaginate({ page: page, itemsPerPage: payload })" />
    <UPagination
      v-model:page="page"
      :items-per-page="parseInt(itemsPerPage.toString())"
      :total="props.totalItems"
      :ui="{
        list: 'flex-wrap'
      }"
      @update:page="(payload) => emitPaginate({ page: payload, itemsPerPage: itemsPerPage })"
    />
  </div>
</template>

<style scoped lang="css">

</style>
