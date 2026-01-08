<script setup lang="ts">
import type {PropType, Ref} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {PermissionTemplate} from "~/types/api/item/clubDependent/permissionTemplate";
import type {MemberPermission} from "~/types/api/item/clubDependent/memberPermission";
import {Permission, permissionSections} from "~/types/api/permissions";
import {useSelfUserStore} from "~/stores/useSelfUser";
import MemberPermissionQuery from "~/composables/api/query/clubDependent/MemberPermissionQuery";
import PermissionTemplateQuery from "~/composables/api/query/clubDependent/PermissionTemplateQuery";
import {displayApiError} from "~/utils/resource";

type PermissionGridMode = 'member' | 'template';

const props = defineProps({
  mode: {
    type: String as PropType<PermissionGridMode>,
    required: true,
    validator: (value: string) => ['member', 'template'].includes(value)
  },
  member: {
    type: Object as PropType<Member>,
    default: null
  },
  template: {
    type: Object as PropType<PermissionTemplate>,
    default: null
  },
  canEdit: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits<{
  updated: []
}>();

const selfStore = useSelfUserStore();
const isAdmin = selfStore.isAdmin();

const isLoading = ref(false);
const isSaving = ref(false);
const permissionItems: Ref<MemberPermission[]> = ref([]);
const templatePermissionItems: Ref<MemberPermission[]> = ref([]);

// For member mode: compute if member has a template and get its permissions
const memberTemplate = computed(() => {
  if (props.mode !== 'member' || !props.member?.permissionTemplate) return null;
  return props.member.permissionTemplate;
});

// Compute current permission values for easy lookup
const currentPermissions = computed(() => {
  return permissionItems.value.map(p => p.permission);
});

// Compute template permission values for inheritance display
const templatePermissions = computed(() => {
  return templatePermissionItems.value.map(p => p.permission);
});

// Filter permission sections and features based on club plugin status
const filteredPermissionSections = computed(() => {
  const club = selfStore.selectedProfile?.club;
  if (!club) return permissionSections;

  return permissionSections
    .filter(section => {
      // If no plugin required, always show
      if (!section.plugin) return true;
      // Check if the required plugin is enabled for the club
      return club[section.plugin] === true;
    })
    .map(section => ({
      ...section,
      // Filter features within each section
      features: section.features.filter(feature => {
        if (!feature.plugin) return true;
        return club[feature.plugin] === true;
      })
    }))
    // Remove sections that have no features after filtering
    .filter(section => section.features.length > 0);
});

// Create query instances based on mode
const memberPermissionQuery = computed(() => {
  if (props.mode !== 'member' || !props.member) return null;
  return new MemberPermissionQuery(props.member);
});

const templateQuery = computed(() => {
  return new PermissionTemplateQuery();
});

async function loadPermissions() {
  isLoading.value = true;

  try {
    if (props.mode === 'member' && props.member?.uuid && memberPermissionQuery.value) {
      // Load member permissions
      const { items, error } = await memberPermissionQuery.value.getAll();
      if (!error) {
        permissionItems.value = items || [];
      }

      // If member has a template, also load template permissions
      if (memberTemplate.value && memberTemplate.value['@id']) {
        const templatePerms = await templateQuery.value.getTemplatePermissions(memberTemplate.value);
        templatePermissionItems.value = templatePerms || [];
      } else {
        templatePermissionItems.value = [];
      }
    } else if (props.mode === 'template' && props.template) {
      if (!props.template['@id'] && !props.template.uuid) {
        permissionItems.value = [];
        return;
      }
      // Load template permissions
      const templatePerms = await templateQuery.value.getTemplatePermissions(props.template);
      permissionItems.value = templatePerms || [];
    }
  } catch (error) {
    console.error('Failed to load permissions', error);
  } finally {
    isLoading.value = false;
  }
}

async function addPermission(permission: Permission): Promise<boolean> {
  if (props.mode === 'member' && memberPermissionQuery.value) {
    const { created, error } = await memberPermissionQuery.value.addPermission(permission);
    if (!error && created) {
      permissionItems.value.push(created);
      return true;
    }
  } else if (props.mode === 'template' && props.template) {
    const created = await templateQuery.value.addPermission(props.template, permission);
    if (created) {
      permissionItems.value.push(created);
      return true;
    }
  }
  return false;
}

async function removePermission(permission: Permission): Promise<boolean> {
  const existingItem = permissionItems.value.find(p => p.permission === permission);
  if (!existingItem) return false;

  if (props.mode === 'member' && memberPermissionQuery.value) {
    const { error } = await memberPermissionQuery.value.removePermission(existingItem);
    if (!error) {
      permissionItems.value = permissionItems.value.filter(p => p.uuid !== existingItem.uuid);
      return true;
    }
  } else if (props.mode === 'template' && props.template) {
    await templateQuery.value.removePermission(props.template, existingItem);
    permissionItems.value = permissionItems.value.filter(p => p.uuid !== existingItem.uuid);
    return true;
  }
  return false;
}

async function togglePermission(permission: Permission, linkedPermission?: Permission, isEditToggle: boolean = false) {
  if (!props.canEdit || (!isAdmin && props.mode === 'member')) return;

  isSaving.value = true;

  try {
    const hasPerm = hasPermission(permission);

    if (hasPerm) {
      // Removing permission
      if (!isEditToggle && linkedPermission && hasPermission(linkedPermission)) {
        // When removing access, also remove edit
        await removePermission(linkedPermission);
      }
      await removePermission(permission);
    } else {
      // Adding permission
      if (isEditToggle && linkedPermission && !hasPermission(linkedPermission)) {
        // When adding edit, also add access if not present
        await addPermission(linkedPermission);
      }
      await addPermission(permission);
    }
    // Reload permissions to sync with any backend auto-grants
    await loadPermissions();
    emit('updated');
  } catch (error: any) {
    displayApiError(error);
  } finally {
    isSaving.value = false;
  }
}

function hasPermission(permission: Permission): boolean {
  return currentPermissions.value.includes(permission);
}

function hasTemplatePermission(permission: Permission): boolean {
  return templatePermissions.value.includes(permission);
}

/**
 * Get inheritance indicator for a permission
 */
function getInheritanceInfo(permission: Permission): { isInherited: boolean; templateValue?: boolean } {
  if (props.mode !== 'member' || !memberTemplate.value) {
    return { isInherited: false };
  }

  const hasMemberPerm = hasPermission(permission);
  const hasTemplatePerm = hasTemplatePermission(permission);

  if (!hasMemberPerm && hasTemplatePerm) {
    // Permission only comes from template
    return { isInherited: true, templateValue: true };
  } else if (hasMemberPerm) {
    // Member has explicit permission, show override indicator
    return { isInherited: false, templateValue: hasTemplatePerm };
  }

  return { isInherited: false };
}

/**
 * Check if effective permission is granted (member or template)
 */
function isEffectivelyGranted(permission: Permission): boolean {
  return hasPermission(permission) || hasTemplatePermission(permission);
}

// Load permissions on mount
onMounted(async () => {
  await loadPermissions();
});

watch([() => props.member, () => props.template], async () => {
  await loadPermissions();
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="mode === 'member' && !isAdmin" class="text-sm text-muted italic">
      Seuls les administrateurs peuvent modifier les permissions.
    </div>

    <!-- Template indicator for member mode -->
    <div v-if="mode === 'member' && memberTemplate" class="text-sm text-muted bg-muted/50 rounded-lg p-2">
      <UIcon name="i-lucide-file-text" class="mr-1" />
      Modèle appliqué : <strong>{{ memberTemplate.name }}</strong>
    </div>

    <!-- Sections grid - 2-3 columns on desktop -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="section in filteredPermissionSections" :key="section.label" class="border border-default rounded-lg p-3">
        <div class="text-md font-semibold mb-2">{{ section.label }}</div>

        <!-- Header row -->
        <div class="grid grid-cols-[1fr_auto_auto] gap-2 text-xs text-muted font-medium">
          <span></span>
          <span class="w-14 text-center">Accès</span>
          <span class="w-14 text-center">Édition</span>
        </div>

        <!-- Feature rows -->
        <div v-for="feature in section.features" :key="feature.name" class="py-1">
          <div class="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <span class="text-sm">{{ feature.name }}</span>
            <!-- Access column: hide if editOnly -->
            <div class="w-14 flex flex-col items-center">
              <USwitch
                v-if="!feature.editOnly"
                :model-value="mode === 'member' ? isEffectivelyGranted(feature.accessPermission) : hasPermission(feature.accessPermission)"
                :disabled="!canEdit || (!isAdmin && mode === 'member') || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.accessPermission, feature.editPermission, false)"
              />
              <!-- Inheritance indicator for member mode -->
              <template v-if="mode === 'member' && memberTemplate">
                <span
                  v-if="getInheritanceInfo(feature.accessPermission).isInherited"
                  class="text-xs text-primary/70"
                  title="Hérité du modèle"
                >
                  modèle
                </span>
                <span
                  v-else-if="hasPermission(feature.accessPermission) && getInheritanceInfo(feature.accessPermission).templateValue !== undefined"
                  class="text-xs text-warning/70"
                  :title="getInheritanceInfo(feature.accessPermission).templateValue ? 'Personnalisé (modèle: oui)' : 'Personnalisé'"
                >
                  perso
                </span>
              </template>
            </div>
            <!-- Edit column: show editOnly toggle here, hide accessOnly -->
            <div class="w-14 flex flex-col items-center">
              <USwitch
                v-if="feature.editOnly"
                :model-value="mode === 'member' ? isEffectivelyGranted(feature.accessPermission) : hasPermission(feature.accessPermission)"
                :disabled="!canEdit || (!isAdmin && mode === 'member') || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.accessPermission, undefined, false)"
              />
              <USwitch
                v-else-if="!feature.accessOnly"
                :model-value="mode === 'member' ? isEffectivelyGranted(feature.editPermission!) : hasPermission(feature.editPermission!)"
                :disabled="!canEdit || (!isAdmin && mode === 'member') || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.editPermission!, feature.accessPermission, true)"
              />
              <!-- Inheritance indicator for edit permission -->
              <template v-if="mode === 'member' && memberTemplate && !feature.accessOnly && !feature.editOnly">
                <span
                  v-if="getInheritanceInfo(feature.editPermission!).isInherited"
                  class="text-xs text-primary/70"
                  title="Hérité du modèle"
                >
                  modèle
                </span>
                <span
                  v-else-if="hasPermission(feature.editPermission!) && getInheritanceInfo(feature.editPermission!).templateValue !== undefined"
                  class="text-xs text-warning/70"
                  :title="getInheritanceInfo(feature.editPermission!).templateValue ? 'Personnalisé (modèle: oui)' : 'Personnalisé'"
                >
                  perso
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
</style>
