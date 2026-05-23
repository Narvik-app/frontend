<script setup lang="ts">
import type { PropType } from 'vue'
import type { InventoryItem } from '~/types/api/item/clubDependent/plugin/sale/inventoryItem'
import InventoryItemQuery from '~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery'

const props = defineProps({
  item: {
    type: Object as PropType<InventoryItem>,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'updated', item: InventoryItem): void
}>()

const toast = useToast()
const query = new InventoryItemQuery()

const pendingQuantity = ref<number | null>(
  props.item.quantity ?? null
)
const isSaving = ref(false)

watch(() => props.item.quantity, (val) => {
  pendingQuantity.value = val ?? null
})

const isLowStock = computed(() =>
  pendingQuantity.value != null &&
  props.item.quantityAlert != null &&
  pendingQuantity.value <= props.item.quantityAlert
)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function scheduleUpdate(newValue: number | null) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => save(newValue), 500)
}

function onStepChanged(delta: number) {
  if (props.readonly) return
  const current = pendingQuantity.value ?? 0
  pendingQuantity.value = current + delta
  scheduleUpdate(pendingQuantity.value)
}

function onInput(raw: string) {
  if (props.readonly) return
  const parsed = raw === '' ? null : Number(raw)
  pendingQuantity.value = parsed === null || Number.isNaN(parsed) ? null : parsed
  scheduleUpdate(pendingQuantity.value)
}

async function save(value: number | null) {
  isSaving.value = true
  const previous = props.item.quantity ?? null

  const { updated, error } = await query.patch(props.item, {
    '@id': props.item['@id'],
    quantity: value,
  } as InventoryItem)

  isSaving.value = false

  if (error) {
    pendingQuantity.value = previous
    toast.add({ title: 'Erreur', description: error.message, color: 'error' })
    return
  }

  if (updated) {
    emit('updated', updated)
  }
}
</script>

<template>
  <div class="flex items-center gap-1" @click.stop>
    <GenericStackedUpDown v-if="!readonly" @changed="onStepChanged" />
    <UInput
      :model-value="pendingQuantity?.toString() ?? ''"
      type="number"
      class="w-20 text-center"
      :class="isLowStock ? 'font-bold text-error-600' : ''"
      :disabled="readonly"
      @update:model-value="onInput"
    />
    <UIcon v-if="isSaving" name="i-heroicons-arrow-path" class="animate-spin text-muted text-xs" />
  </div>
</template>
