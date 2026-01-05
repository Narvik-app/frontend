<script setup lang="ts">
import type {PermissionTemplate} from "~/types/api/item/clubDependent/permissionTemplate";
import type {FormError, TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {NuxtError} from "#app";
import type {ItemError} from "~/types/api/itemError";
import PermissionTemplateQuery from "~/composables/api/query/clubDependent/PermissionTemplateQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";

import {Permission} from "~/types/api/permissions";

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

const templates: Ref<PermissionTemplate[]> = ref([]);
const isLoading = ref(true);
const totalTemplates = ref(0);
const selectedTemplate: Ref<PermissionTemplate | undefined> = ref(undefined);
const isModalOpen = ref(false);
const modalPermissions: Ref<Permission[]> = ref([]);

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

// Load templates
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

async function rowClicked(_event: Event, row: TableRow<PermissionTemplate>) {
  isLoading.value = true;
  const permissions = await apiQuery.getTemplatePermissions(row.original);
  selectedTemplate.value = {...row.original, permissions}; // Shallow clone with permissions
  modalPermissions.value = permissions.map(p => p.permission) || [];
  isModalOpen.value = true;
  isLoading.value = false;
}

function createTemplate() {
  selectedTemplate.value = {
    name: '',
    permissions: [],
  } as PermissionTemplate;
  modalPermissions.value = [];
  isModalOpen.value = true;
}

async function updateTemplate(template: PermissionTemplate) {
  if (!template.name) return;
  isLoading.value = true;
  let error: NuxtError<ItemError> | undefined = undefined;

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

    if (!template.uuid) {
      // Creation
      const created = await apiQuery.createTemplate(template.name!, clubIri);
      if (created) {
        // Add initial permissions
        for (const permission of modalPermissions.value) {
          await apiQuery.addPermission(created, permission);
        }
        
        toast.add({
          color: "success",
          title: "Modèle créé"
        });
        isModalOpen.value = false;
      } else {
        toast.add({
          color: "error",
          title: "La création a échoué"
        });
      }
    } else {
      // Update
      const updated = await apiQuery.updateTemplate(template as PermissionTemplate, template.name!);
      if (updated) {
        // Diff permissions
        const initialPerms = template.permissions?.map(p => p.permission) || [];
        const currentPerms = modalPermissions.value;
        
        // to add: in current but not in initial
        const toAdd = currentPerms.filter(p => !initialPerms.includes(p));
        // to remove: in initial but not in current
        const toRemove = template.permissions?.filter(p => !currentPerms.includes(p.permission)) || [];
        
        for (const permission of toAdd) {
          await apiQuery.addPermission(updated, permission);
        }
        
        for (const permItem of toRemove) {
          await apiQuery.removePermission(updated, permItem);
        }
        
        toast.add({
          color: "success",
          title: "Modèle modifié"
        });
        isModalOpen.value = false;
      } else {
        toast.add({
          color: "error",
          title: "La modification a échoué"
        });
      }
    }
  } catch (e: any) {
    toast.add({
      color: "error",
      title: "Une erreur est survenue",
      description: e.message || "Erreur inconnue"
    });
  } finally {
    isLoading.value = false;
    await getTemplates();
  }
}

async function deleteTemplate() {
  if (!selectedTemplate.value) return;
  isLoading.value = true;

  try {
    await apiQuery.deleteTemplate(selectedTemplate.value as PermissionTemplate);
    toast.add({
      color: "success",
      title: "Modèle supprimé"
    });
    selectedTemplate.value = undefined;
    isModalOpen.value = false;
  } catch (error) {
    toast.add({
      color: "error",
      title: "La suppression a échoué"
    });
  }

  isLoading.value = false;
  await getTemplates();
}

const validate = (state: any): FormError[] => {
  const errors = [];
  if (!state.name) errors.push({ name: 'name', message: 'Champ requis' });
  return errors;
};

function onPermissionsUpdated(permissions: Permission[]) {
  modalPermissions.value = permissions;
}
</script>

<template>
  <GenericCardWithActions title="Modèles de permissions">
      <template #actions>
        <UButton @click="createTemplate">
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
              <UButton @click="createTemplate" variant="outline">
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

    <!-- Template Modal -->
    <UModal v-model:open="isModalOpen" :ui="{ content: 'w-full sm:max-w-4xl' }">
      <template #content>
        <UCard v-if="selectedTemplate">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ selectedTemplate.uuid ? 'Modifier le modèle' : 'Nouveau modèle' }}
              </h3>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="isModalOpen = false" />
            </div>
          </template>

          <UForm :state="selectedTemplate" @submit="updateTemplate(selectedTemplate)" :validate="validate">
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom du modèle" name="name">
                <UInput v-model="selectedTemplate.name" placeholder="Ex: Superviseur ventes" autofocus class="w-full" />
              </UFormField>
            </div>

            <!-- Permission grid shown immediately in offline mode -->
            <div class="mt-6">
              <div class="font-medium mb-2">Permissions du modèle</div>
              <div class="max-h-[60vh] overflow-y-auto pr-2">
                <PermissionGrid
                  mode="template"
                  :template="selectedTemplate"
                  :can-edit="true"
                  :auto-save="false"
                  :initial-permissions="modalPermissions"
                  @update:permissions="onPermissionsUpdated"
                />
              </div>
            </div>

            <div class="mt-6 flex justify-between items-center">
              <UButton
                v-if="selectedTemplate.uuid"
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
                Supprimer
              </UButton>
              <div v-else></div> <!-- Spacer -->

              <div class="flex gap-2">
                 <UButton color="neutral" variant="ghost" @click="isModalOpen = false">
                  Annuler
                </UButton>
                <UButton type="submit" :loading="isLoading">
                  {{ selectedTemplate.uuid ? 'Enregistrer' : 'Créer' }}
                </UButton>
              </div>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

</template>

<style scoped lang="css">
</style>
