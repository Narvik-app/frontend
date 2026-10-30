import type {Locator, Page} from '@playwright/test';
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
  targets: ScreenshotTarget[];
};

const DOCS_TT = 'frontend/docs/temps-kilometres/images';
const DOCS_LOAN = 'frontend/docs/pret/images';

const dialog = (page: Page) => page.getByRole('dialog');

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
    targets: [{repo: 'docs', path: `${DOCS_TT}/mes-declarations`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/formulaire-declaration`}],
  },
  {
    id: 'tt-mes-vehicules',
    role: 'SUPERVISOR',
    url: '/time-and-travel/vehicles',
    targets: [{repo: 'docs', path: `${DOCS_TT}/mes-vehicules`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/formulaire-vehicule`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/liste-exports`}],
  },
  {
    id: 'tt-taux-horaire-smic',
    role: 'ADMIN',
    url: '/admin/time-and-travel/exports',
    locator: page => page.locator('form', {hasText: 'Taux horaire SMIC'}),
    targets: [{repo: 'docs', path: `${DOCS_TT}/taux-horaire-smic`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/nouvel-export`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/detail-export`}],
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
    targets: [{repo: 'docs', path: `${DOCS_TT}/verrouillage-export`}],
  },

  // Prêts
  {
    id: 'loan-liste-prets',
    role: 'ADMIN',
    url: '/admin/loans',
    targets: [
      {repo: 'docs', path: `${DOCS_LOAN}/liste-prets`},
      {repo: 'about', path: 'loan'},
    ],
  },
  {
    id: 'loan-types-enregistrement',
    role: 'ADMIN',
    url: '/admin/loans/recording-types',
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/types-enregistrement`}],
  },
  {
    id: 'loan-statistiques',
    role: 'ADMIN',
    url: '/admin/statistics/loans',
    fullPage: true,
    targets: [{repo: 'docs', path: `${DOCS_LOAN}/statistiques`}],
  },
];
