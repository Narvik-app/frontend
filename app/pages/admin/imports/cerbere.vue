<script lang="ts" setup>
import MemberPresenceQuery from "~/composables/api/query/clubDependent/plugin/presence/MemberPresenceQuery";
import MetricQuery from "~/composables/api/query/MetricQuery";
import type {Metric} from "~/types/api/item/metric";
import {displayFileErrorToast, displayFileSuccessToast, getFileFormDataFromUInputChangeEvent} from "~/utils/file";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {Permission} from "~/types/api/permissions";

definePageMeta({
    layout: "admin"
  });

  useHead({
    title: "Import des présences Cerbère"
  })

  const _toast = useToast()
  const selfStore = useSelfUserStore()
  const canEdit = selfStore.can(Permission.ImportPresencesEdit)

  const memberPresenceQuery = new MemberPresenceQuery()
  const metricQuery = new MetricQuery()

  const importBatchesMetric: Ref<Metric | undefined> = ref(undefined)
  metricQuery.get("import-batches").then(value => {
    if (value.retrieved) {
      importBatchesMetric.value = value.retrieved
    }
  })

  const fileUploading = ref(false)
  const _state = reactive({
    file: undefined
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: Type the event parameter properly
  async function getFileObject(event: any) {
    const formData = getFileFormDataFromUInputChangeEvent(event);

    if (!formData) {
      return;
    }

    fileUploading.value = true
    const {created: _created, error} = await memberPresenceQuery.importFromCerbere(formData)
    fileUploading.value = false

    if (error) {
      return displayFileErrorToast(error.message)
    }

    displayFileSuccessToast()
  }

</script>

<template>
  <div class="flex flex-col gap-4">
    <MetricAdminImportBatches />

    <UCard>
      <UAlert
          icon="i-heroicons-megaphone"
          class="mb-4"
          title="L'import ne doit être fait qu'une fois l'import des membres effectué."
          description="Dans le cas contraire, les présences seront enregistrées comme externe."
          color="error"
      />

      <p>L'import ce fait grâce au xls généré par cerbère.</p>
      <p>Celui-ci doit obligatoirement être au format xls.</p>

      <UInput
          :loading="fileUploading"
          :disabled="fileUploading || !canEdit"
          class="my-4"
          type="file"
          accept="application/vnd.ms-excel"
          icon="i-heroicons-document-text"
          @change="getFileObject"
      />

      <UButton target="_blank" to="https://docs.narvik.app/frontend/docs/import/fftir-cerbere.html">Documentation</UButton>

    </UCard>
  </div>
</template>
