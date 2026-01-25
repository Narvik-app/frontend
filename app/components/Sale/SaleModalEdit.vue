<script setup lang="ts">

import type {PropType} from "vue";
import type {Sale} from "~/types/api/item/clubDependent/plugin/sale/sale";
import type {FormError} from "#ui/types";
import SaleQuery from "~/composables/api/query/clubDependent/plugin/sale/SaleQuery";
import {formatDateTimeReadable} from "~/utils/date";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {useSaleStore} from "~/stores/useSaleStore";
import SalePaymentModeQuery from "~/composables/api/query/clubDependent/plugin/sale/SalePaymentModeQuery";
import type {SelectApiItem} from "~/types/select";
import type {SalePaymentMode} from "~/types/api/item/clubDependent/plugin/sale/salePaymentMode";

const props = defineProps(
  {
    sale: {
      type: Object as PropType<Sale>,
      required: true
    }
  }
)

const emit = defineEmits<{ close: [boolean] }>()

const toast = useToast()

const selfStore = useSelfUserStore();
const saleStore = useSaleStore()
const isAdmin = selfStore.isAdmin();

const isLoading = ref(false)
const popoverOpen = ref(false)

const saleQuery = new SaleQuery()
const sale: Sale = {...props.sale}
const paymentModeValue = ref(sale.paymentMode?.uuid)

const paymentModesSelect = computed( () => {
  const items: SelectApiItem<SalePaymentMode>[] = []
  saleStore.paymentModes.forEach(value => {
    items.push({
      label: value.name,
      value: value.uuid
    })
  })
  return items;
})

if (saleStore.paymentModes.length < 1) {
  saleStore.getPaymentModes()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Define proper form state type
const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.createdAt) errors.push({ name: 'createdAt', message: 'Champ requis' })
  return errors
}

async function updateSale() {
  if (!sale.createdAt) {
    toast.add({
      color: "error",
      title: "La date doit être définie",
    });
  }

  if (!sale.createdAt || !props.sale) return;

  const payload: Sale = {
    comment: sale.comment,
    createdAt: sale.createdAt
  }

  if (paymentModeValue.value) {
    const paymentModeQuery = new SalePaymentModeQuery()
    payload.paymentMode = `${paymentModeQuery.getRootUrl()}/${paymentModeValue.value}`;
  }

  if (payload.comment?.trim().length === 0) {
    payload.comment = null
  }

  isLoading.value = true
  const { updated, error } = await saleQuery.patch(sale, payload)
  isLoading.value = false

  if (error || !updated) {
    toast.add({
      color: "error",
      title: "L'enregistrement a échoué",
      description: error?.message
    });
    return;
  }

  // We update the sale with the api update item
  // eslint-disable-next-line vue/no-mutating-props -- TODO: Use emit to update parent instead of prop mutation
  props.sale.createdAt = updated.createdAt
  // eslint-disable-next-line vue/no-mutating-props -- TODO: Use emit to update parent instead of prop mutation
  props.sale.comment = updated.comment
  // eslint-disable-next-line vue/no-mutating-props -- TODO: Use emit to update parent instead of prop mutation
  props.sale.paymentMode = updated.paymentMode

  toast.add({
    color: "success",
    title: "Vente modifiée"
  });

  // We trigger a refresh of the listing
  saleStore.shouldRefreshSales = true

  emit('close', true)
}

</script>

<template>
  <ModalWithActions title="Modification de la vente" @close="(state: boolean) => emit('close', state)">

    <UForm class="flex gap-2 flex-col" :state="sale" :validate="validate">

      <UFormField
        v-if="isAdmin"
        label="Date"
        name="createdAt"
      >
        <UPopover v-model:open="popoverOpen">
          <UButton icon="i-heroicons-calendar-days-20-solid" :label="formatDateTimeReadable(sale.createdAt) || 'Choisir une date'" />

          <template #content>
            <GenericDatePicker v-model="sale.createdAt" mode="dateTime" @close="popoverOpen = false" />
          </template>
        </UPopover>
      </UFormField>

      <UFormField label="Moyen de paiement" name="paymentMode">
        <USelect v-model="paymentModeValue" :items="paymentModesSelect" />
      </UFormField>

      <UFormField label="Commentaire" name="comment">
        <UTextarea v-model="sale.comment" :rows="2" autoresize :maxrows="3" placeholder="Commentaire liée à la vente" />
      </UFormField>
    </UForm>

    <template #actions>
      <UButton
        color="warning"
        :loading="isLoading"
        @click="updateSale()"
      >
        Modifier
      </UButton>
    </template>
  </ModalWithActions>
</template>

<style scoped lang="css">

</style>
