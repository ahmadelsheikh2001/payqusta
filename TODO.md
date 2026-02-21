# Project TODO

Status legend:
- `[x]` Done
- `[~]` Partial
- `[ ]` Not done

## P0 - Critical (Security/Finance)
- [x] Remove all backend default passwords from `src/controllers/authController.js` and `src/controllers/adminController.js`.
- [x] Remove all UI hints/placeholders about default password (`123456`) from admin pages.
- [x] Unify payment fields everywhere: replace remaining `amountPaid` with `paidAmount`.
- [x] Unify product price fields everywhere: replace remaining `sellingPrice/costPrice` with `price/cost`.
- [x] Remove duplicate `getCategories` definition in `src/controllers/productController.js` (keep one source of truth).
- [x] Re-audit public checkout routes to ensure tenant is always required and no fallback leak exists.

## P1 - Business Logic
- [x] Complete coupon application at order execution (not validation only): apply discount, persist usage, increment `usageCount`.
- [x] Enforce `usagePerCustomer` at final payment/checkout stage.
- [x] Prevent coupon race conditions under concurrent requests (transaction or atomic update).
- [x] Finalize API contract cleanup and remove legacy-conflicting endpoints (`/my-tenants` vs `/branches`).
- [x] Ensure `checkLimit` has no bypass for all constrained resources (not only `store`).

## P1 - User Experience
- [x] Standardize Empty States across all pages (content + style consistency).
- [x] Add consistent Skeleton loaders for list/detail screens.
- [x] Validate Portal invoice payment UX end-to-end (loading/error/success/retry).
- [x] Verify responsive behavior for key pages: `PortalCheckout`, `PortalInvoices`, `Reviews`, `Coupons`.

## P2 - Feature Completion
- [x] Complete Multi-branch Analytics (filters, KPIs, date range, export).
- [x] Complete Commission Calculation (rules, persistence, reporting).
- [x] Validate `logout-all` end-to-end to confirm old tokens are invalidated.
- [x] Finalize Reviews/Ratings moderation flow (approve/reject/reply + display policy).

## P2 - Observability & Quality
- [x] Enforce structured logging context (`requestId`, `tenantId`, `userId`) across layers.
- [x] Ensure sensitive data redaction in logs (passwords/tokens/payment secrets).
- [x] Add smoke tests for critical flows: invoice create/pay-all/coupon apply/tenant isolation.
- [x] Add regression tests for financial transitions (`paid`, `remaining`, `status`).

## P3 - Cleanup & Stability
- [x] Remove remaining legacy field references from docs/validation/swagger/import/report/search/supplier modules.
- [ ] Harden seed/demo data so defaults are safe and non-misleading.
- [x] Add migration scripts for legacy records using old field names.
- [x] Refresh API docs after contract unification with accurate examples.

## Integration Tasks (Send To Agent)
1. Remove weak defaults
- Backend: remove `password || '123456'` in `src/controllers/authController.js` and `src/controllers/adminController.js`.
- Frontend: remove "اتركه فارغاً لاستخدام 123456" hints in `client/src/pages/AdminUsersPage.jsx` and `client/src/pages/AdminTenantsPage.jsx`.
- Acceptance: no `123456` default/hint remains in app code (except docs/examples if intentionally kept).

2. Finish payment field unification
- Replace remaining `invoice.amountPaid` with `invoice.paidAmount`.
- Confirm and fix known spots: `src/controllers/collectionController.js`, `client/src/components/PaymentLinkGenerator.jsx`.
- Acceptance: search `amountPaid` should only match domains where it is truly schema-specific (e.g., installments/supplier payments), not invoice main fields.

3. Finish product price field unification
- Replace legacy `sellingPrice/costPrice` with `price/cost` where Product model is used.
- Known files: `src/services/ImportService.js`, `src/services/ReportsService.js`, `src/middleware/validation.js`, `src/controllers/searchController.js`, `src/controllers/supplierController.js`, `src/services/ExcelService.js`, `src/config/swagger.js`.
- Acceptance: product CRUD/import/export/report/search all operate on `price/cost` consistently.

4. Remove duplicate product categories method
- Keep one `getCategories` in `src/controllers/productController.js`, remove the duplicate.
- Acceptance: one definition only, routes still work.

5. Complete coupon execution at checkout
- In `src/controllers/portalController.js` checkout flow:
- Apply coupon discount to invoice totals.
- Persist coupon usage entry in `coupon.usages`.
- Increment `coupon.usageCount`.
- Enforce `usagePerCustomer` and `usageLimit` at final order execution.
- Acceptance: coupon cannot be overused in concurrent requests; usage stats change after successful order.

6. Add coupon race-condition protection
- Use transaction or atomic conditional update (`findOneAndUpdate` with usage constraints).
- Acceptance: parallel checkout attempts cannot exceed coupon limits.

7. Finalize API contract cleanup
- Remove/replace legacy conflicting paths like `/tenants/my-tenants` if `/branches` is the source of truth.
- Acceptance: frontend calls one contract only, backend has no conflicting alias causing drift.

8. Expand checkLimit enforcement
- Ensure `checkLimit` is applied on all relevant create/import routes (including branches/stores where intended).
- Acceptance: plan limits are enforced consistently for user/product/store resources.

9. UX consistency pass
- Standardize empty states and add skeletons for key list/detail pages.
- Validate portal invoice payment flow states (loading/error/success/retry).
- Responsive QA for `PortalCheckout`, `PortalInvoices`, `Reviews`, `Coupons`.
- Acceptance: no broken layout on mobile and no blank loading gaps.

10. Quality and safety
- Add log redaction for sensitive fields.
- Add smoke/regression tests for invoice payment, tenant isolation, and coupon checkout.
- Acceptance: tests run green and cover critical finance/security paths.

## Portal UI/Theme Sprint
- [x] Unify design tokens in `client/src/index.css` (colors, radius, spacing, shadows for light/dark).
- [x] Build shared portal UI primitives: `PortalCard`, `PortalSectionTitle`, `PortalStat`, `PortalEmptyState`, `PortalSkeleton`.
- [x] Standardize button variants and states (primary/secondary/ghost/danger/loading/disabled).
- [x] Standardize form controls (input/select/textarea sizes, borders, focus rings, helper/error text).
- [x] Standardize empty states across all portal pages.
- [x] Add consistent skeleton loaders for portal lists and details.
- [x] Improve `PortalLayout` mobile nav (safe-area + touch targets + active state consistency).
- [x] Unify typography scale (heading/body/caption) across portal pages.
- [x] Unify icon sizing/color usage across portal components.
- [x] Clean `PortalProfile` sections (remove duplicate/overlapping tabs and keep one clear IA).
- [x] Polish `PortalCheckout` visual flow (stepper clarity + coupon/discount summary consistency).
- [x] Polish `PortalInvoices` states and payment action visibility.
- [x] Polish `PortalReviews` cards/replies spacing and readability.
- [x] Run accessibility pass (contrast, focus-visible, labels).
- [x] Run responsive QA matrix on 360/390/768/1024 widths.
- [x] Set visual regression snapshots for key portal screens.

## Owner Frontend Tasks

### P0 - Foundation
- [ ] Unify design tokens (`colors/spacing/radius/shadows/typography`) in `client/src/index.css`.
- [ ] Build a shared owner UI kit (Button/Input/Select/Modal/Card/Table/Badge/EmptyState/Skeleton).
- [~] Standardize page states (Loading / Empty / Error / Retry) across owner pages.
- [ ] Standardize RTL/i18n formatting (dates, numbers, currency, icon direction).
- [ ] Standardize form behavior (label/helper/error/validation states).
- [ ] Standardize session-expiry and 401 UX with clear re-login flow.

### P1 - Core UX Upgrade
- [~] Implement Saved Filters + Saved Views for heavy pages.
- [ ] Implement unified Bulk Actions with preview + confirmation (+ undo when possible).
- [ ] Add inline edit for key entities to reduce modal dependency.
- [ ] Add Command Palette (`Ctrl+K`) for quick navigation and actions.
- [ ] Add a unified Activity Timeline for customer/invoice/product/branch.
- [ ] Add owner onboarding flow for first-time setup.

### P1 - Performance
- [ ] Apply code-splitting on heavy routes.
- [ ] Add virtualized tables for `Customers`, `Invoices`, `Products`.
- [~] Add debounce/throttle for search and filter inputs.
- [ ] Improve caching strategy for dashboard/statistics requests.
- [ ] Reduce bundle size and remove unused imports.
- [ ] Add performance budget + Lighthouse checks in CI.

### P2 - Competitive Features
- [ ] Build Owner Executive Dashboard (KPIs + trends + anomalies).
- [ ] Add KPI drill-down to root-cause views.
- [ ] Build smart Alerts Center (priority + suggested next action).
- [ ] Add Cashflow Radar (7/14/30-day warnings).
- [ ] Add Branch Health Score visualization.
- [ ] Add profitability views (by customer/product/branch).
- [ ] Add Scenario Simulator (price/discount/credit-limit impact).
- [ ] Add Smart Collections Playbook suggestions.

### P2 - AI Differentiation
- [ ] Add stock-out prediction + suggested reorder recommendations.
- [ ] Add customer default-risk prediction before overdue.
- [ ] Add Owner Copilot: daily summary + top 3 actions + explainable reasoning.

### P2 - Trust & Security UX
- [ ] Build Security Center (active devices + recent activity + logout-all).
- [ ] Enforce permission-aware UI behavior by role.
- [ ] Expose audit trail in UI for sensitive actions.
- [ ] Improve destructive-action UX (double confirm + clear warning states).

### P3 - Quality & Maintainability
- [ ] Unify API client layer + error mapping layer.
- [ ] Add visual regression tests for critical owner screens.
- [ ] Add E2E smoke tests for login/customers/invoices/reports.
- [ ] Document frontend architecture + UI conventions.
- [ ] Add component documentation (Storybook or equivalent docs).
- [ ] Define a shared Definition of Done for owner screens.

### Quick Wins
- [~] Standardize `EmptyState + Skeleton` in 5 critical owner pages first.
- [x] Add `Saved Filters` in `Customers` and `Invoices`.
- [ ] Add virtualized rows in `Customers`.
- [ ] Release MVP of Owner Alerts Center.
- [ ] Add Executive KPI strip at top of owner dashboard.
