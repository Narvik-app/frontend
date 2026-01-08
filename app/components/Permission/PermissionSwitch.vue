<script setup lang="ts">
import type { PropType } from 'vue';
import type { Permission } from '~/types/api/permissions';

type PermissionGridMode = 'member' | 'template';

interface InheritanceInfo {
  isInherited: boolean;
  templateValue?: boolean;
}

const props = defineProps({
  mode: {
    type: String as PropType<PermissionGridMode>,
    required: true
  },
  permission: {
    type: String as PropType<Permission>,
    required: true
  },
  linkedPermission: {
    type: String as PropType<Permission>,
    default: undefined
  },
  isEditToggle: {
    type: Boolean,
    default: false
  },
  canEdit: {
    type: Boolean,
    required: true
  },
  isAdmin: {
    type: Boolean,
    required: true
  },
  isSaving: {
    type: Boolean,
    required: true
  },
  isLoading: {
    type: Boolean,
    required: true
  },
  hasPermission: {
    type: Function as PropType<(p: Permission) => boolean>,
    required: true
  },
  isEffectivelyGranted: {
    type: Function as PropType<(p: Permission) => boolean>,
    required: true
  },
  getInheritanceInfo: {
    type: Function as PropType<(p: Permission) => InheritanceInfo>,
    required: true
  }
});

const emit = defineEmits<{
  toggle: [permission: Permission, linkedPermission: Permission | undefined, isEditToggle: boolean]
}>();

const modelValue = computed(() => {
  if (props.mode === 'member') {
    return props.isEffectivelyGranted(props.permission);
  }
  return props.hasPermission(props.permission);
});

const isDisabled = computed(() => {
  return !props.canEdit ||
    (!props.isAdmin && props.mode === 'member') ||
    props.isSaving ||
    props.isLoading ||
    props.getInheritanceInfo(props.permission).isInherited;
});

const switchColor = computed(() => {
  return props.getInheritanceInfo(props.permission).isInherited ? 'neutral' : undefined;
});

function handleToggle() {
  emit('toggle', props.permission, props.linkedPermission, props.isEditToggle);
}
</script>

<template>
  <USwitch
    :model-value="modelValue"
    :disabled="isDisabled"
    :loading="isLoading || isSaving"
    :color="switchColor"
    size="sm"
    @update:model-value="handleToggle"
  />
</template>
