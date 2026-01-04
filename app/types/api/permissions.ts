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
