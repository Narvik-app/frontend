export enum Permission {
  EmailSend = 'EMAIL_SEND',
  EmailTemplate = 'EMAIL_TEMPLATE',
  ImportMembers = 'IMPORT_MEMBERS',
  ImportPhotos = 'IMPORT_PHOTOS',
  ImportPresences = 'IMPORT_PRESENCES',
}

export const permissionLabels: Record<Permission, string> = {
  [Permission.EmailSend]: 'Envoi d\'emails',
  [Permission.EmailTemplate]: 'Modèles d\'emails',
  [Permission.ImportMembers]: 'Import de membres',
  [Permission.ImportPhotos]: 'Import de photos',
  [Permission.ImportPresences]: 'Import de présences',
}

export const allPermissions = Object.values(Permission);

// Grouped permissions by category for UI display
export interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

export const permissionGroups: PermissionGroup[] = [
  {
    label: 'Emails',
    permissions: [Permission.EmailSend, Permission.EmailTemplate],
  },
  {
    label: 'Imports',
    permissions: [Permission.ImportMembers, Permission.ImportPhotos, Permission.ImportPresences],
  },
];
