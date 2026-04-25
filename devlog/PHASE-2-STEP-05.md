# PHASE-2-STEP-05

## Goal

Add the frontend Clerk integration and the first visible Google-login UI for Phase 2.

This step should leave you with:

- the Clerk React dependency installed in the frontend
- the app wrapped in `ClerkProvider`
- a minimal auth-aware header that shows sign-in or user controls
- the existing anonymous share flow still working without login

This step does **not** include:

- username onboarding
- protected frontend routes
- backend user sync
- group UI
- invite UI

---

## Starting Point

Expected starting state:

- `PHASE-2-STEP-04` is already committed
- `frontend/.env.example` exists from Phase 2 config scaffolding
- the frontend currently renders `RouterProvider` directly from `src/main.tsx`
- the router currently exposes only the Phase 1 public routes
- there is no Clerk dependency in `frontend/package.json`

Check:

```bash
git status --short
sed -n '1,160p' frontend/.env.example
sed -n '1,160p' frontend/src/main.tsx
sed -n '1,200p' frontend/src/app/router.tsx
cat frontend/package.json
```

You should see:

- a clean working tree
- a `VITE_CLERK_PUBLISHABLE_KEY` placeholder in the frontend env example
- no `ClerkProvider` yet in `main.tsx`
- no auth-aware app shell in the router
- no `@clerk/react` dependency yet

Why this matters:

This step is the first time Phase 2 becomes visible in the browser. But it should still be a light integration step, not a full auth flow explosion.

---

## Do This

### 1. Install the Clerk React SDK

This repo is a Vite React app, so use Clerk's React SDK directly.

Do not use the React Router framework-mode package here. That is for a different React Router integration style than the one this repo currently uses.

From `frontend/`:

```bash
npm install @clerk/react
```

Why this package:

- Clerk's React quickstart for Vite uses `@clerk/react`
- it gives you `ClerkProvider`, `Show`, `SignInButton`, and `UserButton`
- it fits the current app shape without forcing a router rewrite

### 2. Make sure the frontend has a real local `.env`

Phase 2 config scaffolding introduced `frontend/.env.example`.

Before using Clerk in the frontend, make sure the real local env file exists.

From `frontend/`:

```bash
cp .env.example .env
```

Then update `frontend/.env` with a real publishable key from Clerk:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_real_key_here
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_APP_URL=http://127.0.0.1:5173
```

Important:

- do not commit the real `.env`
- keep `.env.example` as the placeholder contract

### 3. Wrap the app with `ClerkProvider`

Clerk must be mounted near the frontend entry point so its hooks and UI components can work anywhere in the app.

Update `frontend/src/main.tsx`.

Replace it with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'

import { router } from './app/router'
import './index.css'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Add VITE_CLERK_PUBLISHABLE_KEY to frontend/.env')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      <RouterProvider router={router} />
    </ClerkProvider>
  </StrictMode>,
)
```

Why this matters:

- Clerk context becomes available globally
- sign-in and user components can work anywhere below the provider
- the app fails clearly if the publishable key is missing

### 4. Add a minimal app shell with auth-aware header controls

Right now each page renders its own top content directly.

Phase 2 needs one shared place to show:

- sign-in entry point
- signed-in user state
- basic app identity

Create:

- `frontend/src/components/AppShell.tsx`

Write:

```tsx
import { Outlet } from 'react-router-dom'
import { Show, SignInButton, UserButton } from '@clerk/react'

export function AppShell() {
  return (
    <main className="page stack">
      <header className="app-header">
        <div className="stack">
          <p className="eyebrow">Rahasia</p>
          <p className="hint">
            Anonymous sharing still works. Sign in to unlock Phase 2 features.
          </p>
        </div>

        <div className="auth-actions">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button type="button">Sign in with Google</button>
            </SignInButton>
          </Show>

          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      <Outlet />
    </main>
  )
}
```

Why this shell is the right size for this step:

- it introduces visible auth state
- it does not force protected routes yet
- it keeps anonymous usage intact
- it gives future Phase 2 pages a shared frame

### 5. Move the router to a shared layout route

Once the app shell exists, the router should render it once around the public pages.

Update `frontend/src/app/router.tsx` to:

```tsx
import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { CreateSharePage } from '../pages/CreateSharePage'
import { ViewSharePage } from '../pages/ViewSharePage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <CreateSharePage />,
      },
      {
        path: 'shares/:shareId',
        element: <ViewSharePage />,
      },
    ],
  },
])
```

Why use a layout route now:

- one shared header
- fewer duplicated auth controls later
- no route protection yet, only shared presentation

### 6. Remove duplicated top-level wrappers from the existing pages

Because the app shell now provides the main page wrapper and the shared branding header, the existing pages should become simpler.

In `frontend/src/pages/CreateSharePage.tsx`:

- remove the outer `<main className="page stack">`
- remove the repeated `Rahasia` eyebrow line
- keep the page-specific heading and hint

The result should still render a page-specific header, but inside the shared shell.

A good result shape is:

```tsx
return (
  <section className="stack">
    <header className="stack">
      <h1>Create a share</h1>
      <p className="hint">
        Your text or file is encrypted in the browser before it is sent to
        the backend.
      </p>
    </header>

    {error ? <p className="error">{error}</p> : null}

    <ShareForm isSubmitting={isSubmitting} onSubmit={handleCreateShare} />

    {createdShareId && createdShareKey ? (
      <ShareResult shareId={createdShareId} shareKey={createdShareKey} />
    ) : null}
  </section>
)
```

In `frontend/src/pages/ViewSharePage.tsx`:

- remove the outer `<main className="page stack">`
- remove the duplicated `Rahasia` eyebrow
- keep the page-specific title and explanatory text

The result shape should start more like:

```tsx
return (
  <section className="stack">
    <h1>View share</h1>

    <p className="hint">
      Paste the decryption key and open the share when you are ready.
    </p>
```

This keeps the layout clean once the shared shell exists.

### 7. Add the minimal CSS needed for the shared shell

The current styles do not yet define header layout for shared auth controls.

Update `frontend/src/index.css` and add styles such as:

```css
.app-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.auth-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .app-header {
    flex-direction: column;
  }
}
```

Keep the styling minimal. This step is about integration, not visual redesign.

### 8. Keep all routes public for now

This step should not protect frontend routes yet.

That means:

- do not use route guards yet
- do not redirect signed-out users away from the create page
- do not require login to view the old Phase 1 share route

This is important because optional login is a core Phase 2 product rule.

### 9. Verify the integration

From `frontend/`:

```bash
npm run test
npm run build
```

Then run the app:

```bash
npm run dev
```

What to verify manually:

- the app still loads at `/`
- the shared header appears
- signed-out users see a sign-in button
- signed-in users see a user control
- the old create-share flow still renders
- the old share-view route still renders

This step is successful when login becomes visible without breaking anonymous usage.

---

## Expected Result

After this step:

- Clerk is installed in the frontend
- `ClerkProvider` wraps the app
- the app shows basic signed-in vs signed-out state
- all existing Phase 1 routes still work publicly

---

## What Not To Do Yet

Do not:

- build username onboarding yet
- call protected backend routes yet
- hide the old anonymous routes behind login
- build group pages yet
- add complicated auth-only navigation

This step is only the frontend auth entry point.

---

## Verification

Run:

```bash
sed -n '1,220p' frontend/src/main.tsx
sed -n '1,240p' frontend/src/app/router.tsx
sed -n '1,240p' frontend/src/components/AppShell.tsx
cd frontend
npm run test
npm run build
```

Expected result:

- `main.tsx` wraps the app with `ClerkProvider`
- the router uses a shared layout route
- the app shell shows sign-in vs signed-in controls
- frontend tests still pass
- the production build still succeeds

Success looks like:

- Phase 2 login is visible in the UI
- anonymous sharing still works
- the repo is ready for username onboarding in the next step

---

## Finish This Step

Stage the frontend auth-foundation files:

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/main.tsx frontend/src/app/router.tsx frontend/src/components/AppShell.tsx frontend/src/pages/CreateSharePage.tsx frontend/src/pages/ViewSharePage.tsx frontend/src/index.css devlog/PHASE-2-STEP-05.md
```

Then commit:

```bash
git commit -m "feat: add frontend google login flow"
```

---

## Appendix: Get the Clerk Keys

You cannot get real Clerk keys until you create a Clerk account and create an application.

Use this flow:

1. Go to Clerk and sign up.
2. Create a new application.
3. Enable Google as a sign-in method in the Clerk dashboard.
4. Open the application's API keys or Developers section.
5. Copy the test publishable key and the test secret key.
6. Copy the JWT issuer/domain value for backend token verification.

Put the values in these files:

`frontend/.env`

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_APP_URL=http://127.0.0.1:5173
```

`backend/.env`

```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_ISSUER=https://your-instance.clerk.accounts.dev
BACKEND_PUBLIC_URL=http://127.0.0.1:8000
FRONTEND_PUBLIC_URL=http://127.0.0.1:5173
```

Important:

- `pk_test_...` is the publishable key and is safe for frontend use.
- `sk_test_...` is the secret key and must stay backend-only.
- Do not commit real `.env` files.
- Keep `.env.example` files as placeholders only.

If you have not created a Clerk account yet, leave the placeholder values in the examples until you are ready to set up the real app.
