import {expect, type Locator, type Page} from '@playwright/test';
import {STORAGE_STATE} from '../e2e/utils/auth';

export type ScreenshotTarget = {
  /** Repository receiving the image */
  repo: 'docs' | 'about';
  /** Path of the image, relative to the repo images root and WITHOUT extension (always exported as .webp) */
  path: string;
};

export type ScreenshotDefinition = {
  /** Unique name, used for the intermediate png */
  id: string;
  role: keyof typeof STORAGE_STATE;
  url: string;
  /** Run after the page settled (open a modal, fill a form...) */
  prepare?: (page: Page) => Promise<void>;
  /** Crop the capture to this element (defaults to the viewport) */
  locator?: (page: Page) => Locator;
  /** Capture the whole scrollable page instead of the viewport */
  fullPage?: boolean;
  /**
   * 'content' only captures the main content (no header, menu nor footer), 'page' the whole viewport.
   * Defaults to 'content' for images only used in the documentation, 'page' for the about website (and full page captures).
   */
  crop?: 'content' | 'page';
  /** Keep only the top N css pixels of the captured element (long pages or lists) */
  clipHeight?: number;
  targets: ScreenshotTarget[];
};

const DOCS_TT = 'frontend/docs/temps-kilometres/images';
const DOCS_LOAN = 'frontend/docs/pret/images';
const DOCS_POS = 'frontend/docs/pos/images';
const DOCS_MEMBERS = 'frontend/docs/membres/images';
const DOCS_ACTIVITIES = 'frontend/docs/activites/images';
const DOCS_START = 'frontend/premiers-pas/images';

const dialog = (page: Page) => page.getByRole('dialog');

/** Click the presence of the demo admin in the "today" list of the presence page */
async function openAdminPresence(page: Page) {
  await page.getByRole('cell', {name: /ADMINCLUB1/}).first().click();
  await dialog(page).waitFor();
}

/** The (last, so the innermost) card containing the given locator */
const cardWith = (page: Page, inner: Locator) => page.locator('.rounded-lg', {has: inner}).last();

const addToCart = async (page: Page, times = 1) => {
  for (let i = 0; i < times; i++) {
    await page.getByTestId('add-to-cart').first().click();
  }
};

const selectSeller = async (page: Page) => {
  const input = page.getByTestId('seller-input-wrapper').locator('input');
  await input.click();
  await input.fill('Adminclub1');
  await page.getByRole('option').first().click();
};

const openCustomItemModal = async (page: Page) => {
  await page.locator('button:has([class*="heroicons"][class*="plus"])').first().click();
  await dialog(page).waitFor();
};

const fillCustomItem = async (page: Page) => {
  await dialog(page).getByLabel('Nom').fill('Test');
  await dialog(page).getByLabel('Prix de vente').fill('12');
};

/** The export list is sorted by period, newest first: the first one is the draft */
async function openFirstExport(page: Page) {
  await page.getByRole('link', {name: 'Détail'}).first().click();
  await page.waitForURL(/\/exports\/.+/);
  await page.getByRole('button', {name: 'Verrouiller définitivement'}).waitFor();
  await page.locator('tbody tr').first().waitFor();
}

/**
 * Single source of truth of every generated image.
 * Images that show an external tool (iTAC, Cerbère, Eden...) can't be generated and stay manual.
 */
export const screenshots: ScreenshotDefinition[] = [
  // Temps & kilomètres
  {
    id: 'tt-mes-declarations',
    role: 'SUPERVISOR',
    url: '/time-and-travel',
    targets: [{repo: 'docs', path: `${DOCS_TT}/my-declarations`}],
  },
  {
    id: 'tt-formulaire-declaration',
    role: 'SUPERVISOR',
    url: '/time-and-travel',
    prepare: async (page) => {
      await page.getByTestId('declaration-create').click();
      await dialog(page).waitFor();
      await page.getByTestId('declaration-description').fill('Réunion de bureau');
      await page.getByTestId('declaration-hours').fill('2');
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_TT}/declaration-form`}],
  },
  {
    id: 'tt-mes-vehicules',
    role: 'SUPERVISOR',
    url: '/time-and-travel/vehicles',
    targets: [{repo: 'docs', path: `${DOCS_TT}/my-vehicles`}],
  },
  {
    id: 'tt-formulaire-vehicule',
    role: 'SUPERVISOR',
    url: '/time-and-travel/vehicles',
    prepare: async (page) => {
      await page.getByTestId('vehicle-create').click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_TT}/vehicle-form`}],
  },
  {
    id: 'tt-admin-declarations',
    role: 'ADMIN',
    url: '/admin/time-and-travel',
    targets: [{repo: 'docs', path: `${DOCS_TT}/admin-declarations`}],
  },
  {
    id: 'tt-admin-vehicles',
    role: 'ADMIN',
    url: '/admin/time-and-travel/vehicles',
    targets: [{repo: 'docs', path: `${DOCS_TT}/admin-vehicles`}],
  },
  {
    id: 'tt-liste-exports',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    targets: [{repo: 'docs', path: `${DOCS_TT}/exports-list`}],
  },
  {
    id: 'tt-taux-horaire-smic',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    locator: page => page.locator('form', {hasText: 'Taux horaire SMIC'}),
    targets: [{repo: 'docs', path: `${DOCS_TT}/smic-hourly-rate`}],
  },
  {
    id: 'tt-nouvel-export',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    prepare: async (page) => {
      await page.getByRole('button', {name: 'Nouvel export'}).click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_TT}/new-export`}],
  },

  {
    id: 'tt-attestations',
    role: 'SUPERVISOR',
    url: '/time-and-travel',
    locator: page => page.locator('.rounded-lg', {has: page.getByText('Attestations', {exact: true})}).last(),
    targets: [{repo: 'docs', path: `${DOCS_TT}/attestations`}],
  },
  {
    id: 'tt-detail-export',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    prepare: openFirstExport,
    targets: [{repo: 'docs', path: `${DOCS_TT}/export-detail`}],
  },
  {
    id: 'tt-verrouillage-export',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    prepare: async (page) => {
      await openFirstExport(page);
      await page.getByRole('button', {name: 'Verrouiller définitivement'}).click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_TT}/export-lock`}],
  },


  // Point de vente
  {
    id: 'pos-categories',
    role: 'ADMIN',
    url: '/admin/inventories/categories',
    targets: [{repo: 'docs', path: `${DOCS_POS}/categories`}],
  },
  {
    id: 'pos-inventaire',
    role: 'ADMIN',
    url: '/admin/inventories',
    targets: [{repo: 'docs', path: `${DOCS_POS}/inventory`}, {repo: 'about', path: 'inventory'}],
  },
  {
    id: 'pos-detail-article',
    role: 'ADMIN',
    url: '/admin/inventories',
    prepare: async (page) => {
      // Categories can be collapsed by default
      const row = page.locator('div.cursor-pointer').first();
      if (!await row.isVisible()) {
        await page.getByTestId('inventory-category-header').first().click();
      }
      await row.click();
      await page.getByRole('link', {name: 'Voir en détail'}).click();
      await page.waitForURL(/\/inventories\/items\/.+/);
    },
    targets: [{repo: 'docs', path: `${DOCS_POS}/item-detail`}],
  },
  {
    id: 'pos-vente-liste-1',
    role: 'ADMIN',
    url: '/admin/sales/new',
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-1`}, {repo: 'about', path: 'sale-list'}],
  },
  {
    id: 'pos-vente-liste-2',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: async (page) => {
      await addToCart(page, 2);
      await selectSeller(page);
    },
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-2`}],
  },
  {
    // The cart with its quantity arrows
    id: 'pos-vente-liste-3',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: page => addToCart(page, 2),
    locator: page => cardWith(page, page.getByTestId('cart-total-price')),
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-3`}],
  },
  {
    // The search bar with the "custom item" button, top of the list
    id: 'pos-vente-liste-4',
    role: 'ADMIN',
    url: '/admin/sales/new',
    locator: page => cardWith(page, page.getByPlaceholder('Rechercher...')),
    clipHeight: 260,
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-4`}],
  },
  {
    id: 'pos-vente-liste-5',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: async (page) => {
      await openCustomItemModal(page);
      await fillCustomItem(page);
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-5`}],
  },
  {
    id: 'pos-vente-liste-6',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: async (page) => {
      await addToCart(page, 2);
      await openCustomItemModal(page);
      await fillCustomItem(page);
      await dialog(page).getByRole('button', {name: 'Ajouter au panier'}).click();
      await dialog(page).waitFor({state: 'hidden'});
    },
    locator: page => cardWith(page, page.getByTestId('cart-total-price')),
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-6`}],
  },
  {
    id: 'pos-vente-liste-7',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: async (page) => {
      await addToCart(page, 2);
      await selectSeller(page);
      await page.locator('[data-testid^="payment-mode-"]').nth(2).click();
    },
    locator: page => page.locator('div', {has: page.getByTestId('cart-total-price')}).filter({has: page.getByTestId('finalize-sale')}).last(),
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-list-7`}],
  },
  {
    id: 'pos-vente-impression',
    role: 'ADMIN',
    url: '/admin/sales/new',
    prepare: page => page.emulateMedia({media: 'print'}),
    fullPage: true,
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-print`}, {repo: 'about', path: 'sale-print'}],
  },
  {
    id: 'pos-historique',
    role: 'ADMIN',
    url: '/admin/sales/history',
    targets: [{repo: 'about', path: 'sale-history-sales'}],
  },
  {
    id: 'pos-par-articles',
    role: 'ADMIN',
    url: '/admin/sales',
    targets: [{repo: 'about', path: 'sale-history-articles'}],
  },
  {
    id: 'pos-vente-detail-1',
    role: 'ADMIN',
    url: '/admin/sales/history',
    prepare: async (page) => {
      await page.locator('tbody a[href*="/admin/sales/"]').first().click();
      await page.waitForURL(/\/admin\/sales\/[^/]+$/);
    },
    // Same crop for both targets (about images keep the whole layout by default)
    crop: 'content',
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-detail-1`}, {repo: 'about', path: 'sale-history'}],
  },
  {
    id: 'pos-vente-detail-2',
    role: 'ADMIN',
    url: '/admin/sales/history',
    prepare: async (page) => {
      await page.locator('tbody a[href*="/admin/sales/"]').first().click();
      await page.waitForURL(/\/admin\/sales\/[^/]+$/);
      await page.getByRole('button', {name: 'Modifier'}).click();
      await dialog(page).waitFor();
    },
    targets: [{repo: 'docs', path: `${DOCS_POS}/sale-detail-2`}],
  },

  // Membres, présences, configuration
  {
    id: 'members-liste',
    role: 'ADMIN',
    url: '/admin/members',
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/list`}],
  },
  {
    id: 'members-details',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByRole('link', {name: 'Détail'}).first().click();
      await page.waitForURL(/\/admin\/members\/.+/);
    },
    fullPage: true,
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/details`}, {repo: 'about', path: 'member-profile'}],
  },
  {
    id: 'presences-liste',
    role: 'ADMIN',
    url: '/',
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/presences`}, {repo: 'about', path: 'presences'}],
  },
  {
    id: 'presences-history',
    role: 'ADMIN',
    url: '/admin/presences',
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/presences-history`}],
  },
  {
    id: 'presences-controles',
    role: 'ADMIN',
    url: '/',
    locator: page => cardWith(page, page.getByText('Membres enregistrés aujourd\'hui')),
    targets: [{repo: 'about', path: 'member-controls-presence'}],
  },
  {
    id: 'presences-details',
    role: 'ADMIN',
    url: '/',
    prepare: openAdminPresence,
    targets: [{repo: 'about', path: 'presences-details'}],
  },
  {
    id: 'presences-details-card',
    role: 'ADMIN',
    url: '/',
    prepare: openAdminPresence,
    locator: dialog,
    targets: [{repo: 'about', path: 'member-controls-presence-detail'}],
  },
  {
    id: 'members-edit',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByRole('link', {name: 'Détail'}).first().click();
      await page.waitForURL(/\/admin\/members\/.+/);
      await page.getByRole('button', {name: 'Modifier', exact: true}).click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'about', path: 'member-edit'}],
  },
  {
    id: 'members-profile',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByRole('link', {name: 'Détail'}).first().click();
      await page.waitForURL(/\/admin\/members\/.+/);
    },
    crop: 'content',
    clipHeight: 880,
    targets: [{repo: 'about', path: 'user-profile'}],
  },
  {
    id: 'members-profile-presences',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByRole('link', {name: 'Détail'}).first().click();
      await page.waitForURL(/\/admin\/members\/.+/);
    },
    locator: page => page.getByRole('tabpanel').first(),
    targets: [{repo: 'about', path: 'user-profile-2'}],
  },
  {
    id: 'config-controles',
    role: 'ADMIN',
    url: '/admin/config/member-controls',
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/controls-list`}, {repo: 'about', path: 'member-controls-list'}],
  },
  {
    id: 'members-controles',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByRole('link', {name: 'Détail'}).first().click();
      await page.waitForURL(/\/admin\/members\/.+/);
      await page.getByText('Contrôle annuel').first().waitFor();
    },
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/member-controls`}, {repo: 'about', path: 'member-controls'}],
  },
  {
    id: 'config-badgeuse',
    role: 'ADMIN',
    url: '/admin/config/presences',
    targets: [{repo: 'docs', path: `${DOCS_MEMBERS}/badger`}],
  },
  {
    id: 'config-activites',
    role: 'ADMIN',
    url: '/admin/config/activities',
    targets: [{repo: 'docs', path: `${DOCS_ACTIVITIES}/list`}],
  },
  {
    id: 'tt-activite-declaration',
    role: 'ADMIN',
    url: '/admin/config/activities',
    prepare: async (page) => {
      await page.locator('tbody tr').first().click();
      await page.getByText('Déclaration de temps & kilomètres', {exact: true}).waitFor();
      // Shown enabled (not saved)
      await page.getByRole('switch').last().click();
    },
    locator: page => cardWith(page, page.getByText('Déclaration de temps & kilomètres', {exact: true})),
    targets: [{repo: 'docs', path: `${DOCS_TT}/activity-declaration`}],
  },
  {
    id: 'tt-permissions',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByPlaceholder(/Rechercher/).first().fill('Supervisorclub1');
      // Wait for the filter to be applied before opening the (only) member
      await expect(page.getByRole('link', {name: 'Détail'})).toHaveCount(1);
      await page.getByRole('link', {name: 'Détail'}).click();
      await page.waitForURL(/\/admin\/members\/.+/);
      await page.getByRole('tab', {name: 'Permissions'}).click();
    },
    locator: page => page.getByRole('tabpanel').first(),
    targets: [{repo: 'docs', path: `${DOCS_TT}/permissions`}],
  },
  {
    id: 'config-globale',
    role: 'ADMIN',
    url: '/admin/config',
    targets: [{repo: 'docs', path: `${DOCS_START}/global-config`}],
  },
  {
    id: 'config-permissions',
    role: 'ADMIN',
    url: '/admin/config/permissions',
    targets: [{repo: 'about', path: 'permissions-management'}],
  },
  {
    id: 'stats-club',
    role: 'ADMIN',
    url: '/admin/statistics',
    fullPage: true,
    targets: [{repo: 'about', path: 'club-stats'}],
  },

  // About website only: whole layout (menu included) of the pages shown on the homepage
  {
    id: 'about-tt-declarations',
    role: 'ADMIN',
    url: '/admin/time-and-travel',
    targets: [{repo: 'about', path: 'time-travel-declarations'}],
  },
  {
    id: 'about-tt-declaration-form',
    role: 'ADMIN',
    url: '/time-and-travel',
    prepare: async (page) => {
      await page.getByTestId('declaration-create').click();
      await dialog(page).waitFor();
      await page.getByTestId('declaration-description').fill('Installation du matériel');
      await page.getByTestId('declaration-hours').fill('3');
    },
    locator: dialog,
    targets: [{repo: 'about', path: 'time-travel-declaration-form'}],
  },
  {
    id: 'about-tt-exports',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    targets: [{repo: 'about', path: 'time-travel-exports'}],
  },
  {
    id: 'about-tt-export-detail',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    prepare: openFirstExport,
    targets: [{repo: 'about', path: 'time-travel-export-detail'}],
  },
  {
    id: 'about-permission-template',
    role: 'ADMIN',
    url: '/admin/config/permissions',
    prepare: async (page) => {
      await page.locator('tbody tr').first().click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'about', path: 'permission-template'}],
  },
  {
    id: 'about-member-permissions',
    role: 'ADMIN',
    url: '/admin/members',
    prepare: async (page) => {
      await page.getByPlaceholder(/Rechercher/).first().fill('Duval');
      await expect(page.getByRole('link', {name: 'Détail'})).toHaveCount(1);
      await page.getByRole('link', {name: 'Détail'}).click();
      await page.waitForURL(/\/admin\/members\/.+/);
      await page.getByRole('tab', {name: 'Permissions'}).click();
    },
    locator: page => page.getByRole('tabpanel').first(),
    targets: [{repo: 'about', path: 'member-permissions'}],
  },
  {
    id: 'about-home',
    role: 'ADMIN',
    url: '/admin',
    fullPage: true,
    targets: [{repo: 'about', path: 'club-stats-home'}],
  },

  // Prêts
  {
    id: 'loan-liste-prets',
    role: 'ADMIN',
    url: '/admin/loans',
    targets: [
      {repo: 'docs', path: `${DOCS_LOAN}/loans-list`},
      {repo: 'about', path: 'loan'},
    ],
  },
  {
    id: 'loan-types-enregistrement',
    role: 'ADMIN',
    url: '/admin/loans/recording-types',
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/recording-types`}],
  },
  {
    id: 'loan-statistiques',
    role: 'ADMIN',
    url: '/admin/statistics/loans',
    fullPage: true,
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/statistics`}],
  },
  {
    id: 'loan-detail-article',
    role: 'ADMIN',
    url: '/admin/loans',
    prepare: async (page) => {
      await page.getByText('Barbecue', {exact: true}).click();
      await page.waitForURL(/\/loans\/items\/.+/);
    },
    fullPage: true,
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/item-detail`}],
  },
  {
    id: 'loan-formulaire-pret',
    role: 'ADMIN',
    url: '/admin/loans',
    prepare: async (page) => {
      await page.getByRole('button', {name: 'Prêter'}).first().click();
      await dialog(page).waitFor();
    },
    locator: dialog,
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/loan-form`}],
  },
  {
    id: 'loan-pret-point-de-vente',
    role: 'ADMIN',
    url: '/admin/sales/new',
    locator: page => cardWith(page, page.getByText('Matériel en prêt')),
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/loan-in-pos`}],
  },
];
