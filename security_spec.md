# Security Specification — Multi-User Access & Sole Admin Governance

## 1. Data Invariants
1. **Sole Admin Guarantee**: Only `request.auth != null && request.auth.token.email_verified == true && request.auth.token.email.lower() == 'chanthathonglith@gmail.com'` holds Admin authority (`isAdmin()`). No client-writable role flag or `admins` collection mutation can elevate another account.
2. **No Self-Approval**: On creation of `/accessRequests/{userId}`, `uid` MUST match `request.auth.uid == userId`, `email` MUST match `request.auth.token.email`, `status` MUST be `'pending'`, `reviewedByEmail == ''`, and `adminNote == ''`.
3. **Immutable Audit & Ownership Fields**: `uid`, `email`, and `requestedAt` cannot change after creation; `requestedAt` and `updatedAt` MUST equal `request.time`.
4. **Strict Re-Request Boundary**: A non-admin owner may update their own `/accessRequests/{userId}` ONLY when `existing().status != 'approved'`, ONLY affecting `['displayName', 'photoURL', 'reason', 'status', 'reviewedByEmail', 'adminNote', 'updatedAt']`, and forcing `status == 'pending'`, `reviewedByEmail == ''`, `adminNote == ''`. Once `'approved'`, only Admin can change status.
5. **PII Isolation**: Non-admin users can only `get` their own `/accessRequests/{request.auth.uid}` document (`allow list` is strictly `isAdmin()` only).
6. **Shared Workspace Config Isolation**: `/workspaceConfig/{configId}` is readable only by `isAdmin()` or verified users whose `/accessRequests/{request.auth.uid}.data.status == 'approved'`, and writable only by `isAdmin()`.

## 2. Adversarial "Dirty Dozen" Payloads (All Rejected with PERMISSION_DENIED)
1. Unauthenticated read or write to `/accessRequests/{uid}` -> DENIED.
2. User with `email_verified: false` claiming `chanthathonglith@gmail.com` -> DENIED (`email_verified == true` enforced).
3. Non-admin creating `/accessRequests/{uid}` with `status: 'approved'` -> DENIED.
4. Non-admin creating `/accessRequests/{otherUid}` (spoofing another user's document ID) -> DENIED (`userId == request.auth.uid`).
5. Non-admin creating `/accessRequests/{uid}` with `uid` != `request.auth.uid` or spoofed `email` -> DENIED.
6. Non-admin updating their own `/accessRequests/{uid}` to `status: 'approved'` -> DENIED.
7. Non-admin updating `/accessRequests/{uid}` with extra ghost field `isAdmin: true` -> DENIED (`keys().hasOnly(...)` + `affectedKeys().hasOnly(...)`).
8. Non-admin reading (`get`) another user's `/accessRequests/{otherUid}` -> DENIED (PII isolation).
9. Non-admin listing (`list`) `/accessRequests` -> DENIED (`allow list: if isAdmin()`).
10. Non-admin injecting >300 chars into `reason` or `adminNote` or invalid ID string -> DENIED (`isValidId` + `.size()` limits).
11. Non-admin tampering with `requestedAt` / `updatedAt` (client timestamp instead of `request.time`) -> DENIED.
12. Pending/rejected user reading or writing `/workspaceConfig/shared` -> DENIED.
