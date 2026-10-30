---
name: e2e-testing-expert
description: "Expert guide for End-to-End (E2E) testing with Playwright, unit/integration testing with Vitest, and CI/CD automated testing pipeline setup / Panduan ahli pengujian End-to-End (E2E) dengan Playwright, pengujian unit/integrasi dengan Vitest, dan otomatisasi CI/CD."
author: "Roedy Rustam"
version: "4.3.0"
---

# E2E Testing Expert (Playwright 1.49+ / Vitest 3 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for building comprehensive automated test suites using **Playwright 1.49+** (E2E + component testing), **Vitest 3** (unit/integration), and robust CI/CD pipelines. Covers modern testing patterns for Next.js 15, React 19, and API backends.

### Trigger Conditions
- Writing E2E tests for web applications with Playwright.
- Writing unit or integration tests with Vitest.
- Setting up a full automated testing pipeline in GitHub Actions / GitLab CI.
- Testing React components in isolation with Playwright Component Testing.
- Mocking external services (APIs, databases) in tests.
- Setting up visual regression tests.

### Playwright 1.49+ — Key Updates

#### New in 2026
- **`aria-snapshot`**: Assert the accessibility tree as a snapshot — more semantic than DOM snapshots.
- **`page.addLocatorHandler()`**: Handle dynamic UI (modals, cookie banners) automatically.
- **WebSocket testing**: Built-in `page.expectWebSocketEvent()`.
- **Playwright MCP Server**: Expose a Playwright browser to AI agents via MCP tools.

#### Project Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results.xml' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // Setup: seed test DB
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Page Object Model (POM)
```typescript
// tests/e2e/pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    await this.page.waitForURL('/dashboard');
  }
}
```

#### API Mocking with `page.route()`
```typescript
test('shows error when API fails', async ({ page }) => {
  // Intercept and mock API response
  await page.route('**/api/users', (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      contentType: 'application/json',
    });
  });

  await page.goto('/users');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
```

#### Accessibility Assertions (aria-snapshot)
```typescript
test('navigation is accessible', async ({ page }) => {
  await page.goto('/');
  
  // Assert accessibility tree structure
  await expect(page.locator('nav')).toMatchAriaSnapshot(`
    - navigation:
      - link "Home"
      - link "Products"
      - link "Pricing"
      - link "Sign in"
  `);
});
```

#### Auth State Reuse (storageState)
```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  
  // Save session state for reuse in all tests
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});

// tests/e2e/dashboard.spec.ts
import { test } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('dashboard loads correctly', async ({ page }) => {
  await page.goto('/dashboard');
  // Already authenticated — no login needed
});
```

### Vitest 3 — Unit & Integration Testing

#### Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
```

#### React Component Testing
```typescript
import { render, screen, userEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  it('increments count on button click', async () => {
    const user = userEvent.setup();
    render(<Counter initialCount={0} />);

    await user.click(screen.getByRole('button', { name: 'Increment' }));

    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('calls onMaxReached when limit hit', async () => {
    const onMaxReached = vi.fn();
    const user = userEvent.setup();
    render(<Counter initialCount={9} max={10} onMaxReached={onMaxReached} />);

    await user.click(screen.getByRole('button', { name: 'Increment' }));

    expect(onMaxReached).toHaveBeenCalledOnce();
  });
});
```

#### Server Action / API Route Testing
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from 'hono/testing';
import { app } from '../src/server';
import { resetTestDb } from './helpers/db';

describe('POST /api/users', () => {
  beforeEach(resetTestDb);

  it('creates a new user', async () => {
    const client = testClient(app);
    const res = await client.api.users.$post({
      json: { name: 'Alice', email: 'alice@example.com' },
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe('alice@example.com');
  });
});
```

### GitHub Actions CI Pipeline
```yaml
# .github/workflows/test.yml
name: CI Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm run typecheck
      - run: pnpm run test:unit --coverage

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk membangun test suite otomatis yang komprehensif menggunakan **Playwright 1.49+** (E2E + component testing), **Vitest 3** (unit/integrasi), dan pipeline CI/CD yang kuat. Mencakup pola pengujian modern untuk Next.js 15, React 19, dan backend API.

### Kondisi Pemicu
- Menulis E2E test untuk aplikasi web dengan Playwright.
- Menulis unit atau integration test dengan Vitest.
- Menyiapkan pipeline pengujian otomatis di GitHub Actions / GitLab CI.
- Menguji komponen React secara terisolasi.
- Mocking layanan eksternal (API, database) dalam test.
- Menyiapkan visual regression test.

### Playwright 1.49+ — Fitur Baru 2026
- **`aria-snapshot`**: Assert accessibility tree sebagai snapshot.
- **`page.addLocatorHandler()`**: Tangani UI dinamis (modal, cookie banner) secara otomatis.
- **WebSocket testing**: `page.expectWebSocketEvent()` bawaan.
- **Playwright MCP Server**: Ekspos browser Playwright ke agen AI via MCP.

### Page Object Model (POM)
Enkapsulasi selektor dan tindakan halaman dalam kelas terpisah untuk mengurangi duplikasi dan meningkatkan keterbacaan test.

### Mocking API dengan `page.route()`
Gunakan `page.route()` untuk mencegat permintaan jaringan dan mengembalikan respons palsu — mengisolasi frontend dari backend dalam E2E test.

### Aksesibilitas dengan aria-snapshot
Gunakan `toMatchAriaSnapshot()` untuk memvalidasi struktur aksesibilitas navigasi, form, dan komponen interaktif — lebih semantis dari snapshot DOM biasa.

### Auth State Reuse (storageState)
Gunakan `storageState` untuk menyimpan state sesi setelah login sekali dan menggunakannya kembali di semua test yang memerlukan autentikasi — menghemat waktu secara signifikan.

### Vitest 3 — Unit & Integration Testing
Vitest 3 adalah test runner yang cepat berbasis Vite dengan kompatibilitas Jest penuh. Gunakan untuk unit test React component, server action, dan logika bisnis.

### Pipeline CI GitHub Actions
Pisahkan job `unit` dan `e2e` untuk feedback paralel yang lebih cepat. Upload `playwright-report` sebagai artifact saat gagal untuk debugging.