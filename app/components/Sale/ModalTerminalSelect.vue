<script setup lang="ts">
/**
 * Checkout-time selection modal: a 2-per-row card grid of the linked TPEs for the
 * chosen payment mode, plus an always-present "Manuel" card that records the sale
 * without any terminal API call.
 */
import type {SalePaymentTerminal} from "~/types/api/item/clubDependent/plugin/sale/salePaymentTerminal";

type SelectResult =
  | { type: 'terminal'; terminal: SalePaymentTerminal }
  | { type: 'manual' }

const props = defineProps<{
  terminals: SalePaymentTerminal[];
  onSelect: (result: SelectResult) => void;
}>()

const emit = defineEmits<{
  close: [boolean]
}>()

function selectTerminal(terminal: SalePaymentTerminal) {
  props.onSelect({type: 'terminal', terminal})
}

function selectManual() {
  props.onSelect({type: 'manual'})
}
</script>

<template>
  <UModal>
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <div class="text-xl font-bold text-center">Choisir un terminal de paiement</div>

          <div class="flex flex-wrap gap-2">
            <div
              v-for="terminal in props.terminals"
              :key="terminal.uuid"
              class="basis-[calc(50%-0.25rem)] flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition border-gray-200 dark:border-gray-700 hover:border-primary"
              @click="selectTerminal(terminal)"
            >
              <UIcon :name="'i-heroicons-' + (terminal.icon || 'device-phone-mobile')" class="text-xl shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ terminal.name }}</div>
                <div v-if="terminal.description" class="text-xs text-gray-500 truncate">{{ terminal.description }}</div>
              </div>
            </div>
          </div>
          <div
            class="basis-[calc(50%-0.25rem)] flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition border-gray-200 dark:border-gray-700 hover:border-primary"
            data-testid="terminal-select-manual"
            @click="selectManual()"
          >
            <UIcon name="i-heroicons-hand-raised" class="text-xl shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">Manuel</div>
              <div class="text-xs text-gray-500 truncate">Enregistrer directement, sans terminal</div>
            </div>
          </div>

          <div class="flex justify-end">
            <UButton color="neutral" variant="ghost" @click="emit('close', false)">
              Annuler
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped lang="css">
</style>
