# Contributing to Narvik Front

Thank you for contributing to Narvik!

## Getting Started

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Start development server**:
    ```bash
    pnpm dev
    ```

## E2E Testing

We use [Playwright](https://playwright.dev/) for End-to-End testing.

### Running Tests

```bash
# Install browsers (first time only)
pnpm exec playwright install

# Run all tests (headless)
pnpm test:e2e

# Run with UI (interactive)
pnpm test:e2e:ui
```

### Writing Tests

Tests are located in `tests/e2e/`.

- **Spec files**: Create files ending in `.spec.ts` (e.g., `tests/e2e/members.spec.ts`).
- **Auth**: Most tests should use the authenticated state.

#### Example Test

```typescript
import { test, expect } from '@playwright/test';
import { resetFixtures } from './utils/db';
import { STORAGE_STATE } from './utils/auth';

// Use authenticated admin state
// Available states: ADMIN, SUPER_ADMIN, MEMBER, BADGER
test.use({ storageState: STORAGE_STATE.ADMIN });

test.describe('Member Management', () => {
    // Reset database before all tests in this group
    test.beforeAll(() => {
        resetFixtures();
    });

    test('can view member list', async ({ page }) => {
        await page.goto('/admin/members');
        
        // Assert page title or content
        await expect(page.getByRole('heading', { name: 'Membres' })).toBeVisible();
    });

    test('can logout', async ({ page }) => {
        // Import logout helper
        const { logout } = await import('./utils/auth');
        
        await page.goto('/');
        await logout(page);
    });

    test('can switch user', async ({ page }) => {
        const { login, logout } = await import('./utils/auth');
        
        await logout(page);
        await login(page, 'other@email.com', 'password');
    });
});
```

### Resetting Data

To ensure tests run in a clean state, use the `resetFixtures()` utility.

- **What it does**: Reloads the database fixtures to their initial state.
- **How it works**:
    - **Locally**: Runs `docker compose exec php composer reload-fixture` in the sibling `../narvik-back` directory.
    - **CI**: Runs the command inside the CI's docker environment.

**Configuration**:
If your backend repository is not located at `../narvik-back`, set the `BACKEND_PATH` environment variable:

```bash
BACKEND_PATH=../my-backend pnpm test:e2e
```
