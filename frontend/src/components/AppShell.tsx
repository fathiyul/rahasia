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
