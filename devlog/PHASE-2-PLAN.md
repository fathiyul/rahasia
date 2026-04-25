For Phase 2, the implementation plan should stay explicitly anchored to the current end-of-Phase-1 codebase.

This phase is larger than Phase 1 in one important way:

- it adds identity
- it adds authorization
- it adds cloud deployment

That means the plan should be more granular.

Do not treat Phase 2 as one giant feature blob called “auth + groups + deploy.”
Break it into narrow, verifiable steps so each layer works before the next layer depends on it.

## Starting Assumption

Phase 2 starts from the current repo state after Phase 1 Step 16 and later Phase 1 documentation additions.

That means the baseline already includes:

- working anonymous encrypted text sharing
- working anonymous encrypted file sharing for small files
- expiration handling
- burn-after-read handling
- backend tests
- frontend tests
- public setup and deployment docs

Phase 2 must not overwrite those docs. It should add new Phase 2 planning and step documents separately.

## Phase 2 Planning Principles

For this phase, keep these rules:

- preserve anonymous sharing
- add login as an optional capability
- introduce authorization before building more UI
- keep groups narrow and access-control-focused
- keep the first multi-user release simple rather than feature-rich
- sequence deployment work so auth and core product flows are stable before cloud rollout

## Updated Phase 2 Step-by-Step Plan

### Step 1: Create Phase 2 planning docs

Do:

- add `devlog/PHASE-2-PRD.md`
- add `devlog/PHASE-2-PLAN.md`
- establish `PHASE-2-STEP-xx.md` naming for future step docs
- note the carried-over Phase 1 items explicitly so they do not disappear

Commit:

- docs: add phase 2 planning docs

### Step 2: Add Phase 2 environment and deployment configuration scaffolding

Do:

- define the new environment variables needed for Clerk, Firebase Hosting, Cloud Run, and production database access
- separate local development configuration from future cloud deployment configuration
- add placeholders for auth keys, app URLs, and backend auth verification settings
- document the minimum config needed to run Phase 2 locally before any feature work depends on it

Commit:

- chore: add phase 2 config scaffolding

### Step 3: Add backend user model and username rules

Do:

- create the application user model
- store auth provider identity fields
- add unique username support
- enforce lowercase normalization and format rules
- add the first migration for users

This step should establish the app-level identity model before group features exist.

Commit:

- feat: add user model and username rules

### Step 4: Add backend auth verification foundation

Do:

- add backend utilities to validate authenticated requests from Clerk
- define how the backend extracts the current user identity
- add shared dependencies/helpers for authenticated endpoints
- keep anonymous endpoints working as they do now

This should not yet add group behavior. It should only make backend auth trustworthy.

Commit:

- feat: add backend auth verification foundation

### Step 5: Add frontend auth integration with Clerk

Do:

- install and configure Clerk in the frontend
- add login and logout UI
- add signed-in and signed-out app state handling
- keep the anonymous Phase 1 flow available without login

At the end of this step, a user should be able to sign in with Google and return to the app successfully.

Commit:

- feat: add frontend google login flow

### Step 6: Add first-login username onboarding

Do:

- create the frontend flow for choosing a username after first Google sign-in if the user does not have one yet
- connect that flow to backend user creation/update logic
- enforce uniqueness and validation errors clearly
- ensure returning users do not see onboarding again once complete

This should finish the identity foundation before group invites depend on usernames.

Commit:

- feat: add username onboarding flow

### Step 7: Add group and membership database models

Do:

- create the `groups` model
- create the `group_memberships` model
- store membership roles as `owner` or `member`
- support soft delete for groups
- enforce the data shape needed for multi-owner groups
- add migrations

Do not add invite logic yet.

Commit:

- feat: add group and membership models

### Step 8: Add group service layer with ownership invariants

Do:

- implement reusable group service logic
- enforce “group must always have at least one owner”
- enforce owner leave and owner removal rules
- centralize ownership checks in backend code instead of scattering them across routes

This step exists because the group rules are easy to break if implemented ad hoc in route handlers.

Commit:

- feat: add group ownership rules

### Step 9: Add group create, list, and detail APIs

Do:

- add authenticated endpoints to create a group
- list groups for the current user
- fetch one group with membership context
- make the creator the first owner automatically

Keep this step focused on read/create before rename/delete/member-management flows.

Commit:

- feat: add group create and read endpoints

### Step 10: Add group rename, leave, and soft-delete APIs

Do:

- add group rename endpoint
- add leave-group endpoint
- add delete-group endpoint
- implement soft delete behavior
- ensure delete and leave respect owner invariants

This should finish the basic group lifecycle.

Commit:

- feat: add group lifecycle endpoints

### Step 11: Add membership management APIs

Do:

- add remove-member endpoint
- add promote-member-to-owner endpoint
- add remove-owner-role endpoint
- enforce “at least one owner remains” in all relevant transitions

Keep permissions simple:

- any owner may manage membership and ownership

Commit:

- feat: add group membership management endpoints

### Step 12: Add invite data model

Do:

- create the `group_invites` model
- support invite targeting by email
- support invite targeting by username
- support shareable invite token links
- support revocation
- intentionally omit expiration in the first Phase 2 release
- add migrations

Commit:

- feat: add group invite model

### Step 13: Add invite creation and lookup APIs

Do:

- add endpoints to create invites by email, username, or link
- add endpoint(s) to inspect a pending invite when opened through the app
- add revoke-invite behavior
- validate that only owners can create or revoke invites

Keep acceptance logic separate for the next step.

Commit:

- feat: add group invite endpoints

### Step 14: Add auto-join invite resolution

Do:

- implement backend logic that matches invite email, username, or token against the current authenticated user
- auto-create the membership when the invite is valid
- prevent duplicate membership creation
- mark invites as accepted when consumed if needed by the final model

This step should result in a complete “open invite and join group” flow.

Commit:

- feat: add auto-join invite resolution

### Step 15: Add frontend group list and group detail UI

Do:

- add UI for listing the user’s groups
- add a group detail page
- show members and current user role
- provide a place to rename, leave, or delete where permitted

This UI should stay functional and minimal. Do not over-design dashboards.

Commit:

- feat: add group list and detail ui

### Step 16: Add frontend invite and membership management UI

Do:

- add invite creation UI for email, username, and link
- add member management controls
- add owner promotion and owner-role removal controls
- add clear error states for ownership-rule violations

At the end of this step, the core group-management surface should work end to end.

Commit:

- feat: add group invite and membership ui

### Step 17: Extend the secret model for signed-in ownership and visibility

Do:

- extend the existing share/secret model to support signed-in ownership metadata
- add explicit visibility mode: `public_link` or `group_restricted`
- make sure the old anonymous flow still maps cleanly to `public_link`
- add migrations

This step should prepare the schema without yet implementing multi-group restriction logic.

Commit:

- feat: add secret visibility model

### Step 18: Add secret-to-group access model

Do:

- create the join model for restricted secret access to one or more groups
- enforce that `group_restricted` secrets reference at least one allowed group
- ensure `public_link` secrets do not depend on membership
- add migrations

Commit:

- feat: add restricted secret group access model

### Step 19: Add backend authorization for restricted secret access

Do:

- centralize secret access checks in backend services or dependencies
- require authentication for `group_restricted` secrets
- allow access when current membership matches at least one allowed group
- deny access immediately after group removal or leave

This step is the real authorization boundary and should be treated carefully.

Commit:

- feat: add restricted secret authorization

### Step 20: Add authenticated secret creation flow

Do:

- allow signed-in users to create secrets with explicit visibility
- allow `public_link`
- allow `group_restricted`
- when restricted, allow selecting one or more groups the creator belongs to
- preserve client-side encryption behavior

Do this for text first if the implementation needs to land incrementally.

Commit:

- feat: add authenticated secret creation

### Step 21: Add restricted secret retrieval flow

Do:

- allow eligible group members to fetch restricted encrypted payloads
- preserve the Phase 1 decrypt experience where appropriate
- distinguish auth errors from missing-link or expired-link errors
- keep the public-link secret flow intact

Commit:

- feat: add restricted secret retrieval

### Step 22: Add group-restricted file secret support

Do:

- extend restricted secret creation and retrieval to support files
- reuse the Phase 1 file encryption and decryption approach
- ensure metadata and authorization logic still behave correctly

Phase 2 intends to keep text and file support aligned with Phase 1, so this should not be left as an indefinite future note.

Commit:

- feat: add restricted file secret support

### Step 23: Reconcile carried-over anonymous share behavior

Do:

- review Phase 1 carried-over issues now that identity and restricted access exist
- fix lifecycle behavior that is now clearly incorrect or risky
- especially revisit burn-after-read semantics so failed decryption does not consume the share
- keep the anonymous flow coherent next to the new authenticated flow

Commit:

- feat: refine anonymous share lifecycle behavior

### Step 24: Add multi-user limits and validation

Do:

- enforce backend-configured limits for groups created, groups joined, and group members
- validate invite creation shapes
- validate username uniqueness and reserved cases
- validate restricted secret visibility rules and group selection rules

This step should harden the app around the newly added multi-user behaviors.

Commit:

- feat: add multi-user limits and validation

### Step 25: Add backend tests for Phase 2 flows

Do:

- test user creation and username validation
- test group creation
- test ownership invariants
- test invite flows
- test restricted secret authorization
- test group leave and delete behavior
- test multi-group access behavior

This should cover the new backend contract before deployment work.

Commit:

- test: add phase 2 backend coverage

### Step 26: Add frontend tests for Phase 2 flows

Do:

- test login-aware UI state where practical
- test username onboarding
- test group creation and rename flows
- test invite flows
- test restricted secret creation flow
- test membership-loss access behavior where practical

The goal is not perfect browser simulation. The goal is regression coverage for the new user-facing flows.

Commit:

- test: add phase 2 frontend coverage

### Step 27: Prepare production database VM setup

Do:

- document and script the PostgreSQL-on-VM setup approach
- define firewall, network, backup, and maintenance expectations
- define environment variables and connection settings for production
- make sure the backend deployment plan has a real target database shape

This step is about production-readiness planning before full rollout, not about changing app behavior.

Commit:

- docs: add postgres vm deployment plan

### Step 28: Deploy backend to Cloud Run

Do:

- containerize the backend if needed for the final deployment shape
- define runtime config and secrets handling
- connect the deployed backend to the production database
- verify health and authenticated API flows in cloud

Commit:

- deploy: add cloud run backend deployment

### Step 29: Deploy frontend to Firebase Hosting

Do:

- configure the Vite frontend for production API origin and Clerk settings
- set up Firebase Hosting for the SPA
- add route rewrite rules
- verify login flow and share flows against the deployed backend

Commit:

- deploy: add firebase hosting frontend deployment

### Step 30: Add Phase 2 deployment and operations docs

Do:

- document the real cloud deployment flow
- document environment management
- document auth setup
- document database VM operational responsibilities
- document how to roll out migrations safely

This should leave the Phase 2 app understandable to another developer and to your future self.

Commit:

- docs: add phase 2 deployment docs

## Recommended Build Order

Do this in this exact order:

1. phase 2 planning docs
2. phase 2 config scaffolding
3. user model and username rules
4. backend auth verification
5. frontend Clerk integration
6. username onboarding
7. group and membership models
8. ownership service rules
9. group create/list/detail APIs
10. group rename/leave/delete APIs
11. membership management APIs
12. invite model
13. invite creation APIs
14. auto-join invite resolution
15. group list/detail UI
16. invite and membership UI
17. secret visibility model
18. secret-to-group access model
19. restricted secret authorization
20. authenticated secret creation
21. restricted secret retrieval
22. restricted file secret support
23. anonymous share lifecycle fixes
24. multi-user limits and validation
25. phase 2 backend tests
26. phase 2 frontend tests
27. production database VM setup
28. Cloud Run backend deployment
29. Firebase Hosting frontend deployment
30. phase 2 deployment docs

## Important Scope Rule

For the first working Phase 2 version, strongly prioritize this order of value:

- optional Google login
- unique username
- groups and multi-owner membership rules
- invite flows
- restricted secret visibility
- real cloud deployment

If a later implementation detail threatens to sprawl, prefer to simplify that detail instead of weakening these core goals.

## Important Simplicity Rule

Do not let Phase 2 drift into:

- social features
- dashboards that behave like content feeds
- rich collaboration features
- overbuilt admin systems
- excessive role systems

The product should still feel like Rahasia, not like a team collaboration suite.

## Carried-Over Notes From Phase 1

These should remain visible while implementing Phase 2:

- the original password-based flow was planned earlier but not delivered
- burn-after-read semantics need another pass
- current deployment docs are still mostly documentation, not yet a finished live deployment story

These are not necessarily the first steps of Phase 2, but they should not be forgotten while the system grows.
