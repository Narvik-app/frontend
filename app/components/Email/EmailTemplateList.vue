<script setup lang="ts">
import type {EmailTemplate} from '~/types/api/item/clubDependent/plugin/emailing/emailTemplate';
import EmailTemplateQuery from '~/composables/api/query/clubDependent/plugin/emailing/EmailTemplateQuery';
import type {TablePaginateInterface} from '~/types/table';
import ModalDeleteConfirmation from '../Modal/ModalDeleteConfirmation.vue';
import {useSelfUserStore} from '~/stores/useSelfUser';
import {Permission} from '~/types/api/permissions';

const toast = useToast()
  const isLoading = ref(true)
  const selfStore = useSelfUserStore()
  const canEdit = selfStore.can(Permission.EmailTemplateEdit)

  const page = ref(1)
  const itemsPerPage = ref(10)
  const totalTemplates = ref(0)

  const templates: Ref<EmailTemplate[]> = ref([])
  const templateQuery = new EmailTemplateQuery()

  const overlay = useOverlay()
  const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation)

  const columns = [
    {
      accessorKey: 'updatedAt',
      header: 'Dernière mise à jour'
    },
    {
      accessorKey: 'name',
      header: 'Nom',
      meta: {
        class: {
          th: 'w-full'
        }
      }
    },
    {
      accessorKey: 'actions',
      header: 'Actions'
    }
  ]

  async function getTemplates() {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString()
    })

    const { error, items, totalItems } = await templateQuery.getAll(urlParams)
    isLoading.value = false

    if (error) {
      toast.add({
        title: "Une erreur s'est produite",
        description: error.message || error.toString(),
        color: "error"
      })
      return
    }

    templates.value = items
    totalTemplates.value = totalItems ? totalItems : 0
  }

  async function deleteTemplate(template: EmailTemplate) {
    const { error } = await templateQuery.delete(template)

    if (error) {
      toast.add({
        title: "La suppression a échouée",
        description: error.message,
        color: "error"
      })
      return
    }

    toast.add({
      title: "Modèle supprimé",
      color: "success"
    })
    getTemplates()
  }

  getTemplates()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex gap-2 flex-row flex-wrap">
        <div class="text-xl font-bold">Modèles</div>
        <div class="flex-1"/>
        <div class="flex justify-end">
          <UButton v-if="canEdit" to="/admin/email/templates/new" icon="i-heroicons-plus" />
        </div>
      </div>

      <UTable :columns="columns" :data="templates">
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun modèles trouvés.</span>
          </div>
        </template>

        <template #updatedAt-cell="{ row }">
          {{ formatDateTimeReadable(row.original.updatedAt) }}
        </template>

        <template #actions-cell="{ row }">
          <div v-if="canEdit" class="flex gap-2">
            <UButton
              icon="i-heroicons-pencil-square"
              color="warning"
              :to="`/admin/email/templates/edit/${convertUuidToUrlUuid(row.original.uuid)}`"
            />
            <UButton
              icon="i-heroicons-trash"
              color="error"
              @click="overlayDeleteConfirmation.open({
                alertDescription: `Le modèle '${row.original.name}' sera supprimé`,
                alertColor: 'error',
                async onDelete() {
                  await deleteTemplate(row.original)
                  overlayDeleteConfirmation.close(true)
                }
              })"
            />
          </div>
        </template>
      </UTable>

      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total-items="totalTemplates"
        @paginate="(object: TablePaginateInterface) => {
          page = object.page
          itemsPerPage = object.itemsPerPage
          getTemplates()
        }"
      />
    </UCard>
  </div>
</template>
