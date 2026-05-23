<script setup lang="ts">
import type { PropType } from 'vue'
import type { InventoryItem } from '~/types/api/item/clubDependent/plugin/sale/inventoryItem'
import InventoryItemQuery from '~/composables/api/query/clubDependent/plugin/sale/InventoryItemQuery'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  items: {
    type: Array as PropType<InventoryItem[]>,
    required: true,
  },
  showStockControl: {
    type: Boolean,
    default: true,
  },
  showReactivate: {
    type: Boolean,
    default: false,
  },
  canEdit: {
    type: Boolean,
    default: false,
  },
  defaultExpanded: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'itemUpdated' | 'itemClicked', item: InventoryItem): void
}>()

const toast = useToast()
const query = new InventoryItemQuery()

const isExpanded = ref(props.defaultExpanded)

const alertCount = computed(() =>
  props.items.filter(
    (item) =>
      item.quantity != null &&
      item.quantityAlert != null &&
      item.quantity <= item.quantityAlert
  ).length
)

async function reactivate(item: InventoryItem) {
  const { updated, error } = await query.patch(item, {
    '@id': item['@id'],
    canBeSold: true,
  } as InventoryItem)

  if (error) {
    toast.add({ title: 'Erreur', description: error.message, color: 'error' })
    return
  }

  if (updated) {
    emit('itemUpdated', updated)
  }
}
</script>

<template>
  <div class="border border-(--ui-border) rounded-lg overflow-hidden">
    <!-- Section header -->
    <button
      class="w-full flex items-center gap-2 px-4 py-2 bg-(--ui-bg-muted) hover:bg-(--ui-bg-elevated) transition-colors text-left"
      @click="isExpanded = !isExpanded"
    >
      <UIcon
        :name="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
        class="text-muted shrink-0"
      />
      <span class="font-semibold uppercase text-sm tracking-wide flex-1">{{ title }}</span>
      <span class="text-xs text-muted">{{ items.length }} article{{ items.length > 1 ? 's' : '' }}</span>
      <UBadge v-if="alertCount > 0" color="error" variant="soft" class="ml-1">
        {{ alertCount }} alerte{{ alertCount > 1 ? 's' : '' }}
      </UBadge>
    </button>

    <!-- Rows -->
    <div v-if="isExpanded">
      <div
        v-for="item in items"
        :key="item.uuid"
        class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-4 py-2 border-t border-(--ui-border) hover:bg-(--ui-bg-elevated)/50 cursor-pointer transition-colors"
        @click="emit('itemClicked', item)"
      >
        <div class="min-w-0 sm:flex-1">
          <span class="font-medium">{{ item.name }}</span>
          <span v-if="item.description" class="block text-xs text-muted truncate">{{ item.description }}</span>
        </div>

        <!-- Stock controls + action buttons -->
        <div class="flex items-center gap-2">
          <template v-if="showStockControl">
            <InventoryStockControl
              :item="item"
              :readonly="!canEdit"
              @updated="emit('itemUpdated', $event)"
            />
            <span
              v-if="item.quantityAlert != null"
              class="text-xs"
              :class="item.quantity != null && item.quantity <= item.quantityAlert ? 'font-bold text-error-600' : 'text-muted'"
            >
              alerte ≤{{ item.quantityAlert }}
            </span>
          </template>

          <div class="flex-1" />

          <UButton
            v-if="showReactivate && canEdit"
            size="xs"
            color="success"
            variant="soft"
            @click.stop="reactivate(item)"
          >
            Réactiver
          </UButton>

          <UButton
            size="xs"
            variant="soft"
            @click.stop="emit('itemClicked', item)"
          >
            Détails
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
