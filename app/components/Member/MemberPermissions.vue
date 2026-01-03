<script setup lang="ts">
import type {PropType, Ref} from "vue";
import type {Member} from "~/types/api/item/clubDependent/member";
import {Permission, permissionLabels, permissionGroups} from "~/types/api/permissions";
import {useSelfUserStore} from "~/stores/useSelfUser";
import {ClubRole} from "~/types/api/item/club";
import {useFetchList, usePost, useDelete} from "~/composables/api/api";

interface PermissionItem {
  uuid: string;
  permission: Permission;
  '@id'?: string;
}

const props = defineProps({
  member: {
    type: Object as PropType<Member>,
    required: true
  }
});

const emit = defineEmits<{
  updated: []
}>();

const toast = useToast();
const selfStore = useSelfUserStore();
const isAdmin = selfStore.isAdmin();

const isLoading = ref(false);
const isSaving = ref(false);
const permissionItems: Ref<PermissionItem[]> = ref([]);

// Only show for supervisors (admins don't need permissions as they have all)
const isSupervisor = computed(() => {
  return props.member.role === ClubRole.Supervisor;
});

// Compute current permission values for easy lookup
const currentPermissions = computed(() => {
  return permissionItems.value.map(p => p.permission);
});

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

function getPermissionsUrl(): string {
  const clubUuid = selfStore.selectedProfile?.club.uuid;
  return `/clubs/${clubUuid}/members/${props.member.uuid}/permissions`;
}

async function loadPermissions() {
  if (!props.member.uuid) return;
  isLoading.value = true;

  try {
    const {items, error} = await useFetchList<PermissionItem>(getPermissionsUrl());
    if (!error) {
      permissionItems.value = items || [];
    }
  } catch (error) {
    console.error('Failed to load permissions', error);
  } finally {
    isLoading.value = false;
  }
}

async function togglePermission(permission: Permission) {
  if (!isAdmin || !props.member.uuid) return;
  isSaving.value = true;

  try {
    if (hasPermission(permission)) {
      // Remove permission
      const existingItem = permissionItems.value.find(p => p.permission === permission);
      if (existingItem) {
        const {error} = await useDelete(`${getPermissionsUrl()}/${existingItem.uuid}`);
        if (!error) {
          permissionItems.value = permissionItems.value.filter(p => p.uuid !== existingItem.uuid);
          toast.add({
            color: 'success',
            title: 'Permission retirée'
          });
          emit('updated');
        } else {
          toast.add({
            color: 'error',
            title: 'Erreur lors de la suppression',
          });
        }
      }
    } else {
      // Add permission - include member IRI in payload (API Platform pattern)
      const memberIri = `/clubs/${selfStore.selectedProfile?.club.uuid}/members/${props.member.uuid}`;
      const {item, error} = await usePost<PermissionItem>(getPermissionsUrl(), {
        member: memberIri,
        permission: permission,
      });

      if (!error && item) {
        permissionItems.value.push(item);
        toast.add({
          color: 'success',
          title: 'Permission ajoutée'
        });
        emit('updated');
      } else {
        toast.add({
          color: 'error',
          title: 'Erreur lors de l\'ajout',
        });
      }
    }
  } catch (error: any) {
    toast.add({
      color: 'error',
      title: 'Erreur lors de la mise à jour',
      description: error.message || 'Une erreur est survenue'
    });
  } finally {
    isSaving.value = false;
  }
}

function hasPermission(permission: Permission): boolean {
  return currentPermissions.value.includes(permission);
}
</script>

<template>
  <GenericCard v-if="isSupervisor" title="Permissions">

    <div v-if="isLoading" class="flex justify-center py-4">
      <USkeleton class="h-4 w-32" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <div v-if="!isAdmin" class="text-sm text-muted italic">
        Seuls les administrateurs peuvent modifier les permissions.
      </div>

      <div v-for="(group, index) in permissionGroups" :key="group.label">
        <USeparator :label="group.label" :class="{'mt-2': index > 0}" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 gap-x-4 mt-2">
          <div v-for="permission in group.permissions" :key="permission" class="flex items-center justify-between">
            <span class="text-sm">{{ permissionLabels[permission] }}</span>
            <USwitch
              :model-value="hasPermission(permission)"
              :disabled="!isAdmin || isSaving"
              @update:model-value="togglePermission(permission)"
            />
          </div>
        </div>
      </div>
    </div>
  </GenericCard>
</template>

<style scoped lang="css">
</style>


