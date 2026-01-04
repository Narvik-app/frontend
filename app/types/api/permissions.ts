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

  // Sale permissions
  SaleHistoryAccess = 'SALE_HISTORY_ACCESS',
  SaleHistoryEdit = 'SALE_HISTORY_EDIT',
  SaleInventoryAccess = 'SALE_INVENTORY_ACCESS',
  SaleInventoryEdit = 'SALE_INVENTORY_EDIT',
  SaleCategoriesAccess = 'SALE_CATEGORIES_ACCESS',
  SaleCategoriesEdit = 'SALE_CATEGORIES_EDIT',
  SalePaymentModesAccess = 'SALE_PAYMENT_MODES_ACCESS',
  SalePaymentModesEdit = 'SALE_PAYMENT_MODES_EDIT',
  SaleImportAccess = 'SALE_IMPORT_ACCESS',
  SaleImportEdit = 'SALE_IMPORT_EDIT',
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
  {
    label: 'Ventes',
    plugin: 'salesEnabled',
    features: [
      {
        name: 'Historique',
        accessPermission: Permission.SaleHistoryAccess,
        editPermission: Permission.SaleHistoryEdit,
      },
      {
        name: 'Inventaire',
        accessPermission: Permission.SaleInventoryAccess,
        editPermission: Permission.SaleInventoryEdit,
      },
      {
        name: 'Catégories',
        accessPermission: Permission.SaleCategoriesAccess,
        editPermission: Permission.SaleCategoriesEdit,
      },
      {
        name: 'Moyens de paiement',
        accessPermission: Permission.SalePaymentModesAccess,
        editPermission: Permission.SalePaymentModesEdit,
      },
      {
        name: 'Import',
        accessPermission: Permission.SaleImportAccess,
        editPermission: Permission.SaleImportEdit,
      },
    ],
  },
];
