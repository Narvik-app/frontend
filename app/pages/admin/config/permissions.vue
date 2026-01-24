<script setup lang="ts">
import type {PermissionTemplate} from "~/types/api/item/clubDependent/permissionTemplate";
import type {FormError, TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import PermissionTemplateQuery from "~/composables/api/query/clubDependent/PermissionTemplateQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {displayApiError} from "~/utils/resource";

definePageMeta({
  layout: "admin"
});

useHead({
  title: 'Modèles de permissions'
});

const toast = useToast();
const overlay = useOverlay();
const overlayDeleteConfirmation = overlay.create(ModalDeleteConfirmation);

const selfStore = useSelfUserStore();
const apiQuery = new PermissionTemplateQuery();

// State
const templates: Ref<PermissionTemplate[]> = ref([]);
const isLoading = ref(true);
const totalTemplates = ref(0);
const selectedTemplate: Ref<PermissionTemplate | undefined> = ref(undefined);

// Modals
const isCreateModalOpen = ref(false);
const isRenameModalOpen = ref(false);
const isEditModalOpen = ref(false);
const newTemplateName = ref('');

// Table columns
const columns = [
  {
    accessorKey: 'name',
    header: 'Nom du modèle'
  },
  {
    accessorKey: 'permissions',
    header: 'Permissions',
    meta: {
      class: {
        th: 'w-full',
      }
    }
  }
];

// Load templates on mount
getTemplates();

async function getTemplates() {
  isLoading.value = true;

  const { items, totalItems } = await apiQuery.getAll();
  templates.value = items || [];
  if (totalItems) {
    totalTemplates.value = totalItems;
  }

  isLoading.value = false;
}

function rowClicked(_event: Event, row: TableRow<PermissionTemplate>) {
  selectedTemplate.value = row.original;
  isEditModalOpen.value = true;
}

function openCreateModal() {
  newTemplateName.value = '';
  isCreateModalOpen.value = true;
}

async function createTemplate() {
  if (!newTemplateName.value.trim()) return;
  isLoading.value = true;

  try {
    const clubIri = selfStore.selectedProfile?.club?.['@id'];
    if (!clubIri) {
      toast.add({
        color: "error",
        title: "Erreur",
        description: "Club non sélectionné"
      });
      return;
    }

    const { created, error } = await apiQuery.createTemplate(newTemplateName.value.trim(), clubIri);
    if (created) {
      toast.add({
        color: "success",
        title: "Modèle créé"
      });
      isCreateModalOpen.value = false;
      await getTemplates();
      
      // Auto-select the newly created template for editing
      const fullTemplate = await apiQuery.get(created.uuid!);
      if (fullTemplate.retrieved) {
        selectedTemplate.value = fullTemplate.retrieved;
        isEditModalOpen.value = true;
      }
    } else if (error) {
      displayApiError(error, "La création a échoué");
    }
  } catch (e: any) {
    displayApiError(e, "Une erreur est survenue");
  } finally {
    isLoading.value = false;
  }
}

function openRenameModal() {
  if (!selectedTemplate.value) return;
  newTemplateName.value = selectedTemplate.value.name || '';
  isRenameModalOpen.value = true;
}

async function renameTemplate() {
  if (!selectedTemplate.value || !newTemplateName.value.trim()) return;
  isLoading.value = true;

  try {
    const { updated, error } = await apiQuery.updateTemplate(selectedTemplate.value, newTemplateName.value.trim());
    if (updated) {
      toast.add({
        color: "success",
        title: "Modèle renommé"
      });
      isRenameModalOpen.value = false;
      selectedTemplate.value = updated;
      await getTemplates();
    } else if (error) {
      displayApiError(error, "Le renommage a échoué");
    }
  } catch (e: any) {
    displayApiError(e, "Une erreur est survenue");
  } finally {
    isLoading.value = false;
  }
}

async function deleteTemplate() {
  if (!selectedTemplate.value) return;
  isLoading.value = true;

  try {
    const { error } = await apiQuery.deleteTemplate(selectedTemplate.value);
    if (!error) {
      toast.add({
        color: "success",
        title: "Modèle supprimé"
      });
      selectedTemplate.value = undefined;
      isEditModalOpen.value = false;
    } else {
      throw error;
    }
  } catch (error: any) {
    displayApiError(error, "La suppression a échoué");
  }

  isLoading.value = false;
  await getTemplates();
}

function onPermissionsUpdated() {
  // Refresh templates list to update permission count
  getTemplates();
}

const validateCreate = (state: any): FormError[] => {
  const errors = [];
  if (!state.newTemplateName?.trim()) errors.push({ name: 'newTemplateName', message: 'Champ requis' });
  return errors;
};

const validateRename = (state: any): FormError[] => {
  const errors = [];
  if (!state.newTemplateName?.trim()) errors.push({ name: 'newTemplateName', message: 'Champ requis' });
  return errors;
};
</script>

<template>
  <GenericCardWithActions title="Modèles de permissions">
    <template #actions>
      <UButton @click="openCreateModal">
        Créer un modèle
      </UButton>
    </template>

    <template #default>
      <UTable
        class="w-full"
        :loading="isLoading"
        :columns="columns"
        :data="templates"
        @select="rowClicked"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-6 gap-3">
            <span class="italic text-sm">Aucun modèle de permissions.</span>
            <UButton variant="outline" @click="openCreateModal">
              Créer votre premier modèle
            </UButton>
          </div>
        </template>

        <template #name-cell="{ row }">
          <div class="font-medium">{{ row.original.name }}</div>
        </template>

        <template #permissions-cell="{ row }">
          <UBadge color="neutral" variant="subtle">
            {{ row.original.permissionsCount || 0 }} permission(s)
          </UBadge>
        </template>
      </UTable>
    </template>
  </GenericCardWithActions>

  <!-- Create Modal (name only) -->
  <UModal v-model:open="isCreateModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Nouveau modèle
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isCreateModalOpen = false" />
          </div>
        </template>

        <UForm :state="{ newTemplateName }" :validate="validateCreate" @submit="createTemplate">
          <UFormField label="Nom du modèle" name="newTemplateName">
            <UInput v-model="newTemplateName" placeholder="Ex: Superviseur ventes" autofocus class="w-full" />
          </UFormField>

          <div class="mt-6 flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" :loading="isLoading">
              Créer
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Edit Modal (permissions) -->
  <UModal v-model:open="isEditModalOpen" :ui="{ content: 'w-full sm:max-w-4xl' }">
    <template #content>
      <UCard v-if="selectedTemplate">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ selectedTemplate.name }}
              </h3>
              <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" size="xs" title="Renommer" @click="openRenameModal" />
            </div>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isEditModalOpen = false" />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <!-- Permission grid with auto-save -->
          <div class="max-h-[60vh] overflow-y-auto pr-2">
            <PermissionGrid
              mode="template"
              :template="selectedTemplate"
              :can-edit="true"
              @updated="onPermissionsUpdated"
            />
          </div>

          <!-- Delete button -->
          <div class="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <UButton
              color="error"
              variant="ghost"
              :loading="isLoading"
              @click="
                overlayDeleteConfirmation.open({
                  async onDelete() {
                    await deleteTemplate()
                    overlayDeleteConfirmation.close(true)
                  }
                })
              "
            >
              Supprimer ce modèle
            </UButton>
            <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">
              Fermer
            </UButton>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Rename Modal -->
  <UModal v-model:open="isRenameModalOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              Renommer le modèle
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isRenameModalOpen = false" />
          </div>
        </template>

        <UForm :state="{ newTemplateName }" :validate="validateRename" @submit="renameTemplate">
          <UFormField label="Nouveau nom" name="newTemplateName">
            <UInput v-model="newTemplateName" placeholder="Nom du modèle" autofocus class="w-full" />
          </UFormField>

          <div class="mt-6 flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="isRenameModalOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" :loading="isLoading">
              Renommer
            </UButton>
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>
</template>

<style scoped lang="css">
</style>
