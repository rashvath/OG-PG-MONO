# NestPG Phase 1: Remaining Work Plan

## Purpose and scope

This plan compares the project with the functionality spreadsheet and the current codebase. Phase 1 includes rows marked **High** in the spreadsheet's separate priority column (treating `High` and `high` as the same value), as requested. The spreadsheet's `P0` / `P1` labels are recorded separately and are not used to override that column.

The project already implements much of the platform. Work below is therefore limited to gaps, acceptance checks, and finishing incomplete flows; it is not a proposal to rebuild existing modules.

## Phase 1 status by requirement

| ID | Spreadsheet priority | Requirement | Current state | Remaining Phase 1 work |
|---|---|---|---|---|
| FR-01 | P0 / High | Authentication and account lifecycle | Partial. Registration, login, owner approval gating, blocked-user handling, logout, `/auth/me`, and one-hour JWTs exist. The spreadsheet explicitly marks forgot password as remaining; the client does not handle token expiry consistently. | Add a secure forgot/reset-password flow, including expiring single-use reset credentials and clear completion/error UX. Handle expired sessions consistently in the client. Verify registration, role redirects, approval/blocking, logout, and profile retrieval. |
| FR-02 | P0 / High | Owner and property assignment | Implemented: admin owner approval, PG assignment, limits, and blocking/revocation paths exist. | Run acceptance checks for multi-PG assignment, owner limits, access after block/revocation, and isolation between owners. Fix only any test-revealed gaps. |
| FR-03 | P0 / High | Property and listing management | Largely implemented: admin listing create/update/status operations, owner updates for assigned listings, and domain validation exist. | Verify create/approve/pause and owner-edit boundaries end to end, including location, contact, pricing, room types, menu, and media validation. Avoid feature rework unless a check fails. |
| FR-05 | P0 / High | Resident lifecycle | Largely implemented: residents can be created, assigned/moved, updated, and marked left with settlement details. | Verify bed assignment and move restrictions, joining terms, move-out settlement, and resulting occupancy updates. Coordinate payment-record changes with FR-06 rather than treating resident amount fields as a transaction history. |
| FR-06 | P0 / High | Rent and deposit ledger | Partial. Residents have rent/deposit and aggregate paid/due fields; the ledger stores dated income/expense amounts and notes. It does not record payment method or define dated rent/deposit obligations and due calculation. | Define the rent/deposit obligation and due-date rules. Add dated manual receipts/payments with method and notes, calculate resident due status from those records, and keep reconciliation explicitly manual (no bank integration implied). |
| FR-08 | P1 / High | Expenses and balance sheet | Partial. Categorized ledger entries, balance snapshots, CSV export, and bulk entry import exist. Bulk import currently discards invalid frontend rows and the API accepts/rejects the submitted batch as a whole; there is no row-level result summary. | Make bulk imports report each accepted/rejected row and its validation error, with a reliable summary. Document and test income, expense, and net-balance calculation rules; ensure exported totals match the persisted entries. |
| FR-09 | P1 / High | Owner document management | Partial. Owners can upload, list/filter, and delete documents scoped to assigned PGs; records have type, timestamps, and owner/property IDs. The model requires a PG, and the exposed workflow is owner-only. | Confirm whether Phase 1 needs owner-level documents in addition to PG documents and whether admins need document access. Implement only the agreed scope, preserving authorization for every read and delete. Verify metadata, upload/retrieval, and cross-owner access restrictions. |
| FR-10 | P1 / High | Issues and complaints | Not found in the current implementation: no issue model, API, or workflow UI was found. | Add issue capture and an auditable lifecycle with priority, responsible owner, status, timestamps, and resolution note. Define who may report, view, assign, and resolve issues before implementation. |
| FR-11 | P0 / High | Tenant discovery | Largely implemented: live listings can be filtered/sorted and the detail page shows pricing, rooms, amenities, menu/rules, location, and contact information. | Acceptance-test discovery against live data, filter/sort behavior, and the displayed full-cost/property details. The enquiry interaction is tracked separately as FR-07 and is low priority in the spreadsheet, so it is not included in Phase 1 by default. |
| FR-13 | P1 / High | Dashboards and reports | Partial. Owner/admin dashboards use persisted records; owner balance-sheet snapshots and CSV export exist. Metric definitions are not published, and exports are currently focused on balance sheets. | Agree and document KPI definitions, then verify every dashboard value against persisted records. Confirm which owner-record exports are required for Phase 1 and implement only missing exports. |
| FR-15 | P1 / High | Employee management | Partial. No employee model, API, or workflow UI was found. The owner already has ledger and balance-sheet features, but the owner overview does not provide the full finance/operations dashboard described in the spreadsheet. | Build both staff management and the owner finance/operations dashboard. Define employee account lifecycle and access roles, and clarify what “incoming” means before implementation. Reuse FR-06/FR-08 financial records and FR-13 metric definitions rather than duplicating their calculations. |

## Suggested delivery order

1. **Agree definitions and boundaries:** define FR-06 rent/deposit obligation and due-date rules; confirm FR-09 document scope and FR-10 reporter/assignee roles; specify FR-15 employee access and the meaning of “incoming.”
2. **Close account and financial foundations:** finish FR-01 session-expiry/reset behavior, then FR-06 dated payment records and due calculations.
3. **Complete operational workflows:** finish FR-08 row-level bulk-import feedback and FR-09 agreed document scope; add FR-10 issue lifecycle.
4. **Finish reporting and dashboard acceptance:** publish FR-13 metric definitions, reconcile dashboard/report values to stored records, and add any agreed missing exports.
5. **Regression acceptance:** verify the existing FR-02, FR-03, FR-05, and FR-11 flows against their spreadsheet acceptance outcomes. Fix only gaps demonstrated by those checks.
6. **Build FR-15** after FR-13 metric definitions are agreed: add staff management and the owner finance/operations dashboard, reusing existing records and reporting logic.

## Explicitly outside Phase 1 by the spreadsheet's High/low column

These rows are marked low (case-insensitive) even where their separate P0/P1 field differs. Keep them out of the Phase 1 build unless priorities are changed:

- **FR-04 Room and bed inventory** — functionality is already present; the spreadsheet marks it low.
- **FR-07 Enquiry management** — public enquiry creation, lead status/outcome tracking, and conversion to move-in remain gaps; defer them at low priority. This means Phase 1 discovery should not promise a working enquiry workflow.
- **FR-12 Freshness and trust** — last-confirmed/stale availability and precise verification claims are not currently represented.
- **FR-14 Audit and support** — a general before/after audit trail for sensitive events is not currently represented.

## Acceptance and release checks

- For each Phase 1 requirement, test its spreadsheet acceptance outcome using the relevant role and persisted data; include authorization-denial and invalid-input cases.
- Exercise the critical renter, owner, and admin journeys across the frontend and API, not only isolated UI screens or endpoints.
- Confirm financial totals from source ledger/payment records, including partial payments, expenses, and date boundaries agreed for FR-06/FR-08/FR-13.
- Confirm no FR-07 enquiry form or FR-12 freshness claim is presented as complete while those requirements remain deferred.
- Keep secrets and environment-specific credentials out of documentation and source control.

## Evidence reviewed

- Feature inventory: [FEATURES_IMPLEMENTED.md](./FEATURES_IMPLEMENTED.md)
- Current flow notes: [flow.md](./flow.md)
- Frontend routes: [nestpg-web/src/App.tsx](./nestpg-web/src/App.tsx)
- Backend route mounting: [nestpg-api/src/app.ts](./nestpg-api/src/app.ts)
- Requirements and priority values: the supplied `diagram book.xlsx`
 