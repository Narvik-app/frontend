<script setup lang="ts">
import type {Email} from '~/types/api/item/clubDependent/plugin/emailing/email';
import EmailQuery from '~/composables/api/query/clubDependent/plugin/emailing/EmailQuery';
import type {TableRow} from '@nuxt/ui';
import type {TablePaginateInterface} from '~/types/table';
import {useSelfUserStore} from '~/stores/useSelfUser';
import {Permission} from '~/types/api/permissions';

const toast = useToast()
  const isLoading = ref(true)
  const selfStore = useSelfUserStore()
  const canEdit = selfStore.can(Permission.EmailEdit)

  const modalOpen = ref(false)
  const selectedEmail: Ref<Email | undefined> = ref(undefined)

  const page = ref(1)
  const itemsPerPage = ref(10)
  const totalEmails: Ref<number> = ref(0)

  const emails: Ref<Email[]> = ref([])
  const emailQuery = new EmailQuery()

  const columns = [
    {
      accessorKey: 'createdAt',
      header: 'Date'
    },
    {
      accessorKey: 'sender',
      header: 'Utilisateur',
      meta: {
        class: {
          th: 'w-1/4'
        }
      }
    },
    {
      accessorKey: 'title',
      header: 'Sujet',
      meta: {
        class: {
          th: 'w-full'
        }
      }
    },
    {
      accessorKey: 'recipientCount',
      header: 'Destinataires'
    },
    {
      accessorKey: 'actions',
      header: 'Actions'
    }
  ]

  async function getEmails() {
    isLoading.value = true

    const urlParams = new URLSearchParams({
      page: page.value.toString(),
      itemsPerPage: itemsPerPage.value.toString()
    })

    const { error, items, totalItems } = await emailQuery.getAll(urlParams)
    isLoading.value = false

    if (error) {
      toast.add({
        title: "Une erreur s'est produite",
        description: error.message || error.toString(),
        color: "error"
      })
      return
    }

    emails.value = items
    totalEmails.value = totalItems ? totalItems : 0
  }

  function selectEmail(row: TableRow<Email>) {
    selectedEmail.value = row.original
    modalOpen.value = true
  }

  getEmails()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UCard>
      <div class="flex gap-2 flex-row flex-wrap">
        <div class="text-xl font-bold">Emails</div>
        <div class="flex-1"/>
        <div class="flex justify-end">
          <UButton v-if="canEdit" to="/admin/email/new" icon="i-heroicons-plus" />
        </div>
      </div>

      <UTable
        :columns="columns"
        :data="emails"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun mails trouvés.</span>
          </div>
        </template>

        <template #createdAt-cell="{ row }">
          {{ formatDateTimeReadable(row.original.createdAt) }}
        </template>

        <template #sender-cell="{ row }">
          <div class="whitespace-normal break-words">
            {{ row.original.sender }}
          </div>
        </template>

        <template #title-cell="{ row }">
          <div class="whitespace-normal break-words">
            {{ row.original.title }}
          </div>
        </template>

        <template #recipientCount-cell="{ row }">
          {{ row.original.recipientCount }} {{ (row.original.recipientCount ?? 0) > 1 ? 'membres' : 'membre' }}
        </template>

        <template #actions-cell="{ row }" >
          <UButton
            label="Voir"
            @click="selectEmail(row)"
          />
        </template>
      </UTable>

      <GenericTablePagination
        v-model:page="page"
        v-model:items-per-page="itemsPerPage"
        :total-items="totalEmails"
        @paginate="(object: TablePaginateInterface) => {
          page = object.page
          itemsPerPage = object.itemsPerPage
          getEmails()
        }"
      />
    </UCard>

    <UModal
      v-model:open="modalOpen"
    >
      <template #content>
        <div>
          <EmailDetails
            v-if="selectedEmail"
            :item="selectedEmail"
            @close="modalOpen = false; selectedEmail = undefined"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
