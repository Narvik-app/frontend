import type { ClubPlugin } from '~/types/api/item/club';

export enum Permission {
  // Email permissions
  EmailAccess = 'EMAIL_ACCESS',
  EmailEdit = 'EMAIL_EDIT',

  // Email template permissions
  EmailTemplateAccess = 'EMAIL_TEMPLATE_ACCESS',
  EmailTemplateEdit = 'EMAIL_TEMPLATE_EDIT',

  // Import permissions
  ImportMembersAccess = 'IMPORT_MEMBERS_ACCESS',
  ImportMembersEdit = 'IMPORT_MEMBERS_EDIT',

  ImportPhotosAccess = 'IMPORT_PHOTOS_ACCESS',
  ImportPhotosEdit = 'IMPORT_PHOTOS_EDIT',

  ImportPresencesAccess = 'IMPORT_PRESENCES_ACCESS',
  ImportPresencesEdit = 'IMPORT_PRESENCES_EDIT',
}

export const permissionLabels: Record<Permission, string> = {
  [Permission.EmailAccess]: 'Accès',
  [Permission.EmailEdit]: 'Édition',
  [Permission.EmailTemplateAccess]: 'Accès',
  [Permission.EmailTemplateEdit]: 'Édition',
  [Permission.ImportMembersAccess]: 'Accès',
  [Permission.ImportMembersEdit]: 'Édition',
  [Permission.ImportPhotosAccess]: 'Accès',
  [Permission.ImportPhotosEdit]: 'Édition',
  [Permission.ImportPresencesAccess]: 'Accès',
  [Permission.ImportPresencesEdit]: 'Édition',
}

export const allPermissions = Object.values(Permission);

// Feature definition with Access and Edit permissions
export interface PermissionFeature {
  name: string;
  accessPermission: Permission;
  editPermission: Permission;
  /** Optional: only show this feature if the specified plugin is enabled for the club */
  plugin?: ClubPlugin;
}

// Permission sections for UI grouping
export interface PermissionSection {
  label: string;
  features: PermissionFeature[];
  /** Optional: only show this section if the specified plugin is enabled for the club */
  plugin?: ClubPlugin;
}

export const permissionSections: PermissionSection[] = [
  {
    label: 'Emails',
    features: [
      {
        name: 'Emails',
        accessPermission: Permission.EmailAccess,
        editPermission: Permission.EmailEdit,
      },
      {
        name: 'Modèles',
        accessPermission: Permission.EmailTemplateAccess,
        editPermission: Permission.EmailTemplateEdit,
      },
    ],
  },
  {
    label: 'Imports',
    features: [
      {
        name: 'Membres',
        accessPermission: Permission.ImportMembersAccess,
        editPermission: Permission.ImportMembersEdit,
      },
      {
        name: 'Photos',
        accessPermission: Permission.ImportPhotosAccess,
        editPermission: Permission.ImportPhotosEdit,
      },
      {
        name: 'Présences',
        accessPermission: Permission.ImportPresencesAccess,
        editPermission: Permission.ImportPresencesEdit,
        plugin: 'presencesEnabled',
      },
    ],
  },
];

/**
 * Get the ACCESS permission for an EDIT permission (hierarchy)
 */
export function getAccessPermission(editPermission: Permission): Permission | null {
  const mapping: Partial<Record<Permission, Permission>> = {
    [Permission.EmailEdit]: Permission.EmailAccess,
    [Permission.EmailTemplateEdit]: Permission.EmailTemplateAccess,
    [Permission.ImportMembersEdit]: Permission.ImportMembersAccess,
    [Permission.ImportPhotosEdit]: Permission.ImportPhotosAccess,
    [Permission.ImportPresencesEdit]: Permission.ImportPresencesAccess,
  };
  return mapping[editPermission] ?? null;
}

/**
 * Check if permission is an EDIT permission
 */
export function isEditPermission(permission: Permission): boolean {
  return permission.endsWith('_EDIT');
}
