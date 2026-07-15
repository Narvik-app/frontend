<script setup lang="ts">
/**
 * Blocking modal shown while a TPE (physical card terminal) processes a payment.
 *
 * The parent drives the phase via the `phase` prop. The modal emits
 * `manual` (validate without terminal) or `cancel` (abort entirely).
 */

export type TerminalPaymentPhase = 'waiting' | 'success' | 'failed' | 'cancelled' | 'error'

const props = defineProps<{
  /** Whether the modal is visible */
  open: boolean;
  /** Human-readable amount, e.g. "15.00 €" */
  amountDisplay: string;
  /** Terminal name shown in the modal */
  terminalName?: string;
  /** Current phase driven by the parent (polling/checkout flow) */
  phase: TerminalPaymentPhase;
  /** Error message shown when phase === 'error' */
  errorMessage?: string;
}>()

const emit = defineEmits<{
  /** Cashier chose to validate the sale manually (bypass terminal) */
  manual: []
  /** Cashier cancelled — no sale should be created */
  cancel: []
}>()

const statusLabel = computed(() => {
  switch (props.phase) {
    case 'waiting': return 'En attente du paiement sur le terminal…'
    case 'success': return 'Paiement confirmé !'
    case 'failed': return 'Le paiement a échoué.'
    case 'cancelled': return 'Paiement annulé sur le terminal.'
    case 'error': return props.errorMessage ?? 'Impossible de contacter le terminal.'
    default: return ''
  }
})

const isActionable = computed(() => ['failed', 'cancelled', 'error'].includes(props.phase))
</script>

<template>
  <UModal :open="props.open" :dismissible="false">
    <template #content>
      <UCard>
        <div class="flex flex-col gap-4">
          <div class="text-xl font-bold text-center">Paiement par terminal</div>
          <div class="text-3xl font-bold text-center">{{ props.amountDisplay }}</div>
          <div v-if="props.terminalName" class="text-sm text-gray-500 text-center">
            {{ props.terminalName }}
          </div>

          <div class="flex flex-col items-center gap-2 py-2">
            <UIcon
              v-if="props.phase === 'waiting'"
              name="i-heroicons-arrow-path"
              class="text-primary text-5xl animate-spin"
            />
            <UIcon
              v-else-if="props.phase === 'success'"
              name="i-heroicons-check-circle"
              class="text-success text-5xl"
            />
            <UIcon
              v-else
              name="i-heroicons-exclamation-triangle"
              class="text-warning text-5xl"
            />

            <p
              class="text-center text-sm"
              :class="isActionable ? 'text-warning font-medium' : ''"
            >
              {{ statusLabel }}
            </p>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <UButton
              variant="soft"
              icon="i-heroicons-pencil-square"
              @click="emit('manual')"
            >
              Valider manuellement la vente
            </UButton>

            <UButton
              color="neutral"
              variant="ghost"
              @click="emit('cancel')"
            >
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
