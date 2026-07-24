import type {ClubPlugin} from '~/types/api/item/club';

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
  SaleNew = 'SALE_NEW', // Grants ability to make sales, implies History and Inventory read access
  SaleHistoryAccess = 'SALE_HISTORY_ACCESS',
  SaleHistoryEdit = 'SALE_HISTORY_EDIT',
  SaleInventoryAccess = 'SALE_INVENTORY_ACCESS',
  SaleInventoryEdit = 'SALE_INVENTORY_EDIT',
  SaleCategoriesAccess = 'SALE_CATEGORIES_ACCESS',
  SaleCategoriesEdit = 'SALE_CATEGORIES_EDIT',
  SalePaymentModesAccess = 'SALE_PAYMENT_MODES_ACCESS',
  SalePaymentModesEdit = 'SALE_PAYMENT_MODES_EDIT',
  SalePaymentTerminalsAccess = 'SALE_PAYMENT_TERMINALS_ACCESS',
  SalePaymentTerminalsEdit = 'SALE_PAYMENT_TERMINALS_EDIT',
  SaleImportAccess = 'SALE_IMPORT_ACCESS',
  SaleImportEdit = 'SALE_IMPORT_EDIT',

  // Loan permissions
  LoanAccess = 'LOAN_ACCESS',
  LoanEdit = 'LOAN_EDIT',
  LoanItemsAccess = 'LOAN_ITEMS_ACCESS',
  LoanItemsEdit = 'LOAN_ITEMS_EDIT',
  LoanCategoriesAccess = 'LOAN_CATEGORIES_ACCESS',
  LoanCategoriesEdit = 'LOAN_CATEGORIES_EDIT',
  LoanRecordingsAccess = 'LOAN_RECORDINGS_ACCESS',
  LoanRecordingsEdit = 'LOAN_RECORDINGS_EDIT',
  LoanBackdate = 'LOAN_BACKDATE',
}

// Feature definition with Access and Edit permissions
export interface PermissionFeature {
  name: string;
  accessPermission: Permission;
  editPermission?: Permission;
  /** If true, only show Access toggle (single toggle in Access column) */
  accessOnly?: boolean;
  /** If true, only show Edit toggle (single toggle in Edit column, uses accessPermission) */
  editOnly?: boolean;
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
        name: 'Faire une vente',
        accessPermission: Permission.SaleNew,
        editOnly: true,
      },
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
        name: 'Terminaux de paiement',
        accessPermission: Permission.SalePaymentTerminalsAccess,
        editPermission: Permission.SalePaymentTerminalsEdit,
      },
      {
        name: 'Import',
        accessPermission: Permission.SaleImportAccess,
        editPermission: Permission.SaleImportEdit,
      },
    ],
  },
  {
    label: 'Prêts',
    plugin: 'loansEnabled',
    features: [
      {
        name: 'Prêts',
        accessPermission: Permission.LoanAccess,
        editPermission: Permission.LoanEdit,
      },
      {
        name: 'Articles',
        accessPermission: Permission.LoanItemsAccess,
        editPermission: Permission.LoanItemsEdit,
      },
      {
        name: 'Catégories',
        accessPermission: Permission.LoanCategoriesAccess,
        editPermission: Permission.LoanCategoriesEdit,
      },
      {
        name: 'Enregistrements',
        accessPermission: Permission.LoanRecordingsAccess,
        editPermission: Permission.LoanRecordingsEdit,
      },
      {
        name: 'Antidater les prêts',
        accessPermission: Permission.LoanBackdate,
        editOnly: true,
      },
    ],
  },
];
