<script setup lang="ts">
import type {PermissionTemplate} from "~/types/api/item/clubDependent/permissionTemplate";
import type {FormError, TableRow} from "#ui/types";
import ModalDeleteConfirmation from "~/components/Modal/ModalDeleteConfirmation.vue";
import type {NuxtError} from "#app";
import type {ItemError} from "~/types/api/itemError";
import PermissionTemplateQuery from "~/composables/api/query/clubDependent/PermissionTemplateQuery";
import {useSelfUserStore} from "~/stores/useSelfUser";

definePageMeta({
  layout: "pos"
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

// Side menu visible
const isVisible = ref(false);
// Watch selected item to close side menu if unselected
watch(selectedTemplate, (value) => {
  isVisible.value = value !== undefined;
});

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

function rowClicked(_event: Event, row: TableRow<PermissionTemplate>) {
  selectedTemplate.value = {...row.original}; // Shallow clone
  isVisible.value = true;
}

function createTemplate() {
  selectedTemplate.value = {
    name: '',
    permissions: [],
  };
}

async function updateTemplate(template: PermissionTemplate) {
  if (!template.name) return;
  isLoading.value = true;
  let error: NuxtError<ItemError> | undefined = undefined;

  const clubIri = selfStore.selectedProfile?.club?.['@id'];
  if (!clubIri) {
    toast.add({
      color: "error",
      title: "Erreur",
      description: "Club non sélectionné"
    });
    isLoading.value = false;
    return;
  }

  if (!template.uuid) {
    // Creation
    const created = await apiQuery.createTemplate(template.name!, clubIri);
    if (created) {
      selectedTemplate.value = created;
      toast.add({
        color: "success",
        title: "Modèle créé"
      });
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
      selectedTemplate.value = updated;
      toast.add({
        color: "success",
        title: "Modèle modifié"
      });
    } else {
      toast.add({
        color: "error",
        title: "La modification a échoué"
      });
    }
  }

  isLoading.value = false;
  await getTemplates();
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

function onPermissionsUpdated() {
  // Reload templates to get updated permission counts
  getTemplates();
}
</script>

<template>
  <GenericLayoutContentWithStickySide
    @keyup.esc="isVisible = false; selectedTemplate = undefined;"
    :has-side-content="isVisible"
    :mobile-side-title="selectedTemplate?.name || 'Nouveau modèle'"
    tabindex="-1"
  >
    <template #main>
      <UCard>
        <div>
          <div class="flex gap-4 mb-4">
            <div class="flex-1">
              <h2 class="text-lg font-semibold">Modèles de permissions</h2>
              <p class="text-sm text-muted">
                Définissez des ensembles de permissions réutilisables pour les superviseurs.
              </p>
            </div>
            <UButton @click="createTemplate">
              Créer un modèle
            </UButton>
          </div>

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
                {{ row.original.permissions?.length || 0 }} permission(s)
              </UBadge>
            </template>
          </UTable>
        </div>
      </UCard>
    </template>

    <template #side>
      <template v-if="selectedTemplate">
        <UForm :state="selectedTemplate" @submit="updateTemplate(selectedTemplate)" :validate="validate">
          <UCard>
            <div class="flex gap-2 flex-col">
              <UFormField label="Nom du modèle" name="name">
                <UInput v-model="selectedTemplate.name" placeholder="Ex: Superviseur ventes" />
              </UFormField>
            </div>
          </UCard>

          <UButton class="mt-4" block type="submit" :loading="isLoading">
            {{ selectedTemplate.uuid ? 'Enregistrer' : 'Créer le modèle' }}
          </UButton>
        </UForm>

        <!-- Permission grid only shown after template is created -->
        <UCard v-if="selectedTemplate.uuid" class="mt-4">
          <template #header>
            <div class="font-medium">Permissions du modèle</div>
          </template>
          <PermissionGrid
            mode="template"
            :template="selectedTemplate"
            :can-edit="true"
            @updated="onPermissionsUpdated"
          />
        </UCard>

        <UButton
          v-if="selectedTemplate.uuid"
          block
          color="error"
          class="mt-4"
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
          Supprimer le modèle
        </UButton>
      </template>
    </template>
  </GenericLayoutContentWithStickySide>
</template>

<style scoped lang="css">
</style>
