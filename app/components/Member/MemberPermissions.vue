<script setup lang="ts">
import type {PropType, Ref} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import type {MemberPermission} from "~/types/api/item/clubDependent/memberPermission";
import {Permission, permissionSections} from "~/types/api/permissions";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {ClubRole} from "~/types/api/item/club";
import MemberPermissionQuery from "~/composables/api/query/clubDependent/MemberPermissionQuery";
import {displayApiError} from "~/utils/resource";

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

const isLoading = ref(false);
const isSaving = ref(false);
const permissionItems: Ref<MemberPermission[]> = ref([]);

// Only show for supervisors (admins don't need permissions as they have all)
const isSupervisor = computed(() => {
  return props.member.role === ClubRole.Supervisor;
});

// Compute current permission values for easy lookup
const currentPermissions = computed(() => {
  return permissionItems.value.map(p => p.permission);
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

// Create query instance when member changes
const permissionQuery = computed(() => {
  if (!props.member) return null;
  return new MemberPermissionQuery(props.member);
});

async function loadPermissions() {
  if (!props.member.uuid || !permissionQuery.value) return;
  isLoading.value = true;

  try {
    const { items, error } = await permissionQuery.value.getAll();
    if (!error) {
      permissionItems.value = items || [];
    }
  } catch (error) {
    console.error('Failed to load permissions', error);
  } finally {
    isLoading.value = false;
  }
}

async function addPermission(permission: Permission): Promise<boolean> {
  if (!permissionQuery.value) return false;

  const { created, error } = await permissionQuery.value.addPermission(permission);
  if (!error && created) {
    permissionItems.value.push(created);
    return true;
  }
  return false;
}

async function removePermission(permission: Permission): Promise<boolean> {
  if (!permissionQuery.value) return false;

  const existingItem = permissionItems.value.find(p => p.permission === permission);
  if (existingItem) {
    const { error } = await permissionQuery.value.removePermission(existingItem);
    if (!error) {
      permissionItems.value = permissionItems.value.filter(p => p.uuid !== existingItem.uuid);
      return true;
    }
  }
  return false;
}

/**
 * Toggle a permission on or off
 * @param permission - The permission to toggle
 * @param linkedPermission - Optional linked permission (for access: edit to remove; for edit: access to add)
 * @param isEditToggle - If true, toggles edit permission (adds access if needed); if false, toggles access (removes edit if needed)
 */
async function togglePermission(permission: Permission, linkedPermission?: Permission, isEditToggle: boolean = false) {
  if (!isAdmin || !props.member.uuid) return;
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

// Load permissions on mount
onMounted(async () => {
  if (isSupervisor.value) {
    await loadPermissions();
  }
});

watch(() => props.member, async () => {
  if (isSupervisor.value) {
    await loadPermissions();
  }
});
</script>

<template>
  <GenericCard v-if="isSupervisor" title="Permissions">

    <div class="flex flex-col gap-4">
      <div v-if="!isAdmin" class="text-sm text-muted italic">
        Seuls les administrateurs peuvent modifier les permissions.
      </div>

      <!-- Sections grid - 2-3 columns on desktop -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(section, sectionIndex) in filteredPermissionSections" :key="section.label" class="border border-default rounded-lg p-3">
          <div class="text-md font-semibold mb-2">{{ section.label }}</div>

          <!-- Header row -->
          <div class="grid grid-cols-[1fr_auto_auto] gap-2 text-xs text-muted font-medium">
            <span></span>
            <span class="w-14 text-center">Accès</span>
            <span class="w-14 text-center">Édition</span>
          </div>

          <!-- Feature rows -->
          <div v-for="feature in section.features" :key="feature.name" class="grid grid-cols-[1fr_auto_auto] gap-2 items-center py-1">
            <span class="text-sm">{{ feature.name }}</span>
            <!-- Access column: hide if editOnly -->
            <div class="w-14 flex justify-center">
              <USwitch
                v-if="!feature.editOnly"
                :model-value="hasPermission(feature.accessPermission)"
                :disabled="!isAdmin || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.accessPermission, feature.editPermission, false)"
              />
            </div>
            <!-- Edit column: show editOnly toggle here, hide accessOnly -->
            <div class="w-14 flex justify-center">
              <USwitch
                v-if="feature.editOnly"
                :model-value="hasPermission(feature.accessPermission)"
                :disabled="!isAdmin || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.accessPermission, undefined, false)"
              />
              <USwitch
                v-else-if="!feature.accessOnly"
                :model-value="hasPermission(feature.editPermission!)"
                :disabled="!isAdmin || isSaving || isLoading"
                :loading="isLoading || isSaving"
                size="sm"
                @update:model-value="togglePermission(feature.editPermission!, feature.accessPermission, true)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </GenericCard>
</template>

<style scoped lang="css">
</style>
