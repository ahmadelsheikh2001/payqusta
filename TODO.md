# Project TODO

## P0 - Critical (Security/Finance)
- [ ] [ ] Remove all backend default passwords from `src/controllers/authController.js` and `src/controllers/adminController.js`.
- [ ] [ ] Remove all UI hints/placeholders about default password (`123456`) from admin pages.
- [ ] [~] Unify payment fields everywhere: replace remaining `amountPaid` with `paidAmount`.
- [ ] [~] Unify product price fields everywhere: replace remaining `sellingPrice/costPrice` with `price/cost`.
- [ ] [ ] Remove duplicate `getCategories` definition in `src/controllers/productController.js` (keep one source of truth).
- [ ] [~] Re-audit public checkout routes to ensure tenant is always required and no fallback leak exists.

## P1 - Business Logic
- [ ] [ ] Complete coupon application at order execution (not validation only): apply discount, persist usage, increment `usageCount`.
- [ ] [ ] Enforce `usagePerCustomer` at final payment/checkout stage.
- [ ] [ ] Prevent coupon race conditions under concurrent requests (transaction or atomic update).
- [ ] [~] Finalize API contract cleanup and remove legacy-conflicting endpoints (`/my-tenants` vs `/branches`).
- [ ] [~] Ensure `checkLimit` has no bypass for all constrained resources (not only `store`).

## P1 - User Experience
- [ ] [~] Standardize Empty States across all pages (content + style consistency).
- [ ] [ ] Add consistent Skeleton loaders for list/detail screens.
- [ ] [~] Validate Portal invoice payment UX end-to-end (loading/error/success/retry).
- [ ] [ ] Verify responsive behavior for key pages: `PortalCheckout`, `PortalInvoices`, `Reviews`, `Coupons`.

## P2 - Feature Completion
- [ ] [~] Complete Multi-branch Analytics (filters, KPIs, date range, export).
- [ ] [ ] Complete Commission Calculation (rules, persistence, reporting).
- [ ] [~] Validate `logout-all` end-to-end to confirm old tokens are invalidated.
- [ ] [~] Finalize Reviews/Ratings moderation flow (approve/reject/reply + display policy).

## P2 - Observability & Quality
- [ ] [~] Enforce structured logging context (`requestId`, `tenantId`, `userId`) across layers.
- [ ] [ ] Ensure sensitive data redaction in logs (passwords/tokens/payment secrets).
- [ ] [ ] Add smoke tests for critical flows: invoice create/pay-all/coupon apply/tenant isolation.
- [ ] [ ] Add regression tests for financial transitions (`paid`, `remaining`, `status`).

## P3 - Cleanup & Stability
- [ ] [ ] Remove remaining legacy field references from docs/validation/swagger/import/report/search/supplier modules.
- [ ] [ ] Harden seed/demo data so defaults are safe and non-misleading.
- [ ] [ ] Add migration scripts for legacy records using old field names.
- [ ] [ ] Refresh API docs after contract unification with accurate examples.
