<script setup lang="ts">
import type {PropType} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {PermissionTemplate} from "~/types/api/item/clubDependent/permissionTemplate";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {ClubRole} from "~/types/api/item/club";
import PermissionTemplateQuery from "~/composables/api/query/clubDependent/PermissionTemplateQuery";
import MemberQuery from "~/composables/api/query/clubDependent/MemberQuery";

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true
  }
});

const emit = defineEmits<{
  updated: []
}>();

const selfStore = useSelfUserStore();
const isAdmin = selfStore.isAdmin();

// Only show for supervisors (admins don't need permissions as they have all)
const isSupervisor = computed(() => {
  return props.member.role === ClubRole.Supervisor;
});

// Template management
const templates = ref<PermissionTemplate[]>([]);
const isLoadingTemplates = ref(false);
const selectedTemplateIri = ref<string | null>(null);
const isAssigningTemplate = ref(false);

const templateQuery = computed(() => new PermissionTemplateQuery());
const memberQuery = computed(() => new MemberQuery());

async function loadTemplates() {
  isLoadingTemplates.value = true;
  try {
    const { items, error } = await templateQuery.value.getAll();
    if (!error) {
      templates.value = items || [];
    }
  } catch (error) {
    console.error('Failed to load templates', error);
  } finally {
    isLoadingTemplates.value = false;
  }
}

// Special value for "no template" option (empty string not allowed by USelect)
const NO_TEMPLATE_VALUE = '__none__';

// Template options for the select dropdown
const templateOptions = computed(() => {
  const options = [{ label: 'Aucun modèle', value: NO_TEMPLATE_VALUE }];
  templates.value.forEach(t => {
    if (t['@id']) {
      options.push({ label: t.name || 'Sans nom', value: t['@id'] });
    }
  });
  return options;
});

// Current template selection
const currentTemplateIri = computed({
  get: () => props.member.permissionTemplate?.['@id'] || NO_TEMPLATE_VALUE,
  set: (value: string) => {
    selectedTemplateIri.value = value === NO_TEMPLATE_VALUE ? null : value;
  }
});

async function assignTemplate() {
  if (!isAdmin || selectedTemplateIri.value === undefined) return;
  isAssigningTemplate.value = true;

  try {
    await memberQuery.value.patch(props.member, {
      permissionTemplate: selectedTemplateIri.value
    } as Partial<Member>);
    emit('updated');
  } catch (error) {
    console.error('Failed to assign template', error);
  } finally {
    isAssigningTemplate.value = false;
  }
}

function onPermissionsUpdated() {
  emit('updated');
}

// Load templates on mount for admins
onMounted(async () => {
  if (isSupervisor.value && isAdmin) {
    await loadTemplates();
  }
});
</script>

<template>
  <GenericCard v-if="isSupervisor" title="Permissions">
    <div class="flex flex-col gap-4">
      <!-- Template selector for admins -->
      <div v-if="isAdmin" class="flex items-end gap-2">
        <UFormField label="Modèle de permissions" class="flex-1">
          <USelect
            v-model="currentTemplateIri"
            :items="templateOptions"
            :loading="isLoadingTemplates"
            placeholder="Sélectionner un modèle..."
            @update:model-value="assignTemplate"
          />
        </UFormField>
        <UButton
          to="/admin/config/permissions"
          icon="i-lucide-settings"
        >
          Gérer les modèles
        </UButton>
      </div>

      <!-- Permission grid -->
      <PermissionGrid
        mode="member"
        :member="member"
        :can-edit="isAdmin"
        @updated="onPermissionsUpdated"
      />
    </div>
  </GenericCard>
</template>

<style scoped lang="css">
</style>
