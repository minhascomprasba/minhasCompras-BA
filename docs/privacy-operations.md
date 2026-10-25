# Account and privacy controls

Implementation on `feature/user-profile-lgpd`; this is not a declaration of blanket LGPD compliance.

## Release requirements

Do not publish the preliminary notice or enable this retention policy in production until the owner supplies and reviews:

- Controller/operator identity and a usable privacy contact, including a channel for people who cannot sign in.
- Actual purposes and legal bases for each processing activity.
- Hosting, database, SMTP and other recipients, locations and any international transfers.
- Backup lifetime and deletion/restore procedures.

Replace the explicit pending-information paragraph in `/privacidade` with reviewed information. Source for rights terminology: [ANPD guidance](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados/direito-dos-titulares).

## Data inventory

| Records | Contents and purpose | Lifetime implemented |
| --- | --- | --- |
| Users | Email, password hash, role, credential version, creation date; account access | Until final deletion after the 7-day cancellation period |
| Invoices/items | Receipt key, dates, payment method, prices, quantities, catalog references; purchase history/analysis | Until final deletion after the 7-day cancellation period |
| Products/establishments | Shared descriptions, commercial identifiers, addresses, coordinates | Shared catalog; preserved by account deletion |
| Imports | Receipt key, status/source, attempts/dates, invoice reference, temporary CAPTCHA path | Metadata until account deletion; image removed on termination/expiry |
| Registration/reset/change challenges | Hashed PIN/token, password hash where applicable, operation, version, expiry, attempts | Used or expired for 24 hours, then hourly cleanup |
| Rate limits | Hashed user/IP bucket keys and counters | Removed after 24 hours |
| Deletion events | Random protocol, UTC day and source (self-service/admin); no account, actor or email link | `ACCOUNT_DELETION_AUDIT_DAYS`, default 90 days, subject to owner review |
| Pending deletion | Account link, hashed cancellation token, request/deadline dates, source | Seven days, then finalization; removed immediately on cancellation |
| Exports | Versioned allowlisted JSON generated in memory | No persistent export file; `Cache-Control: no-store` |
| Backups | Deployment-specific copies | Owner-defined before release |

The SMTP and SEFAZ providers process data needed to send messages and import receipts. The geocoding integration also queries public address providers for establishment coordinates; inventory its actual configured providers before release. Application logging must not capture request bodies, Authorization headers, query strings containing reset tokens, receipt URLs, PINs or SMTP payloads. Configure reverse-proxy/access/error monitoring with equivalent redaction. Historical logs and the old `data/debug/last_nfce_page.html` may already contain personal data: inventory and remove them according to an owner-approved procedure before release. This change stops new receipt-page debug snapshots.

## Credentials and revocation

JWT claim `cv` must equal the current user's `credential_version` through the shared authentication dependency. Missing claims count as zero, preserving legacy sessions until their expiry or the next credential change. Successful email/password changes and password recovery increment the version and invalidate outstanding reset tokens and account challenges. Profile changes return a replacement `TokenResponse`; the browser replaces its stored token/user through AuthContext. Other sessions receive 401. An incorrect confirmation password is a 422 field error, so it does not trigger global logout.

Each change challenge is bound to user, operation, credential version and proposed email/password hash. PINs use a keyed HMAC incorporating the challenge ID. Expiry is 15 minutes; five guesses exhaust a challenge; another request invalidates the same operation's previous challenge. Database buckets enforce three requests per user and direct-peer IP per minute. Run behind a properly configured trusted proxy when remote client IPs are needed; the application intentionally does not trust arbitrary `X-Forwarded-For` headers.

SQLite write locks and PostgreSQL row updates serialize credential confirmation, account deletion, import creation and receipt persistence. The last SUPER_ADMIN guard shares the administrator lock with role changes. Deletion blocks all WAITING_CAPTCHA/PROCESSING imports, even if the processing deadline has passed. A crashed PROCESSING job must be investigated and explicitly marked FAILED by the operator only after confirming its worker has stopped; expiring a running worker automatically could allow it to persist data after deletion. No worker should be abandoned without this operational reconciliation.

Schema additions use existing `create_all` and startup ALTER updates. Existing records are preserved; credential versions backfill to zero. A unique index on `lower(email)` prevents case-variant duplicates, including concurrent registrations/changes. If historical case-variant duplicates exist, startup fails safely while creating this index: reconcile their ownership before migrating; the migration never discards or merges accounts automatically. Take a backup before applying schema updates. SQLite and PostgreSQL syntax paths are supported; SQLite is covered by the automated suite. Validate against the deployment's PostgreSQL version in staging before release.

## Scheduled cleanup

Run from the repository working directory with the same DATABASE_URL/environment and storage volume as the API:

```sh
.venv/bin/python -m src.api.services.retention_service
```

The command is idempotent. Install the example systemd service/timer in `docs/operations/` after replacing paths and choosing an appropriate service user. Alternatively schedule this hourly, with stdout/stderr directed to restricted operational logs:

```cron
0 * * * * cd /srv/minhas-compras && /srv/minhas-compras/.venv/bin/python -m src.api.services.retention_service
```

Do not copy development credentials into the scheduler. Monitor command failures and disk usage; ensure the scheduler sees every API instance's CAPTCHA volume. Startup cleanup is a fallback; hourly scheduling remains required even when the API receives no requests. Terminal/expired import images and local browser sessions are released; unreferenced CAPTCHA files older than 24 hours are removed. Running browser resources are process-local; the API process owns their lifecycle. Use a single import-owning worker or add cross-worker routing before scaling the existing in-memory import runtime.

## Account deletion

Deletion requires the current password and the UI confirmation EXCLUIR. It first schedules a deadline exactly seven days ahead, revokes sessions/reset tokens/challenges and blocks protected access and new imports. SMTP must accept the cancellation notice before the transaction commits; delivery failure leaves the account unchanged. Pending accounts cannot log in or use password recovery until cancellation. The email contains a random cancellation secret in a URL fragment (not the HTTP URL); only its hash is stored. Opening the cancellation page does not restore the account automatically: the user must submit the confirmation, which consumes the token, restores access without issuing a login session, and revokes prior credentials again. A cancellation attempt at or after the deadline is rejected. No owner/admin action skips the grace period. The sole active SUPER_ADMIN cannot schedule deletion; scheduled administrators do not satisfy the last-active-admin guard.

The hourly cleanup finalizes due accounts (startup cleanup is a fallback); missed runs delay deletion, never advance it. Finalization and cancellation use the same database locks to prevent races. Until finalization, account details remain identifiable and the administrative user table explicitly shows PENDING_DELETION and the deadline. There is no immediate anonymization during the waiting period. At finalization, it removes the user, owned invoices/items, imports, reset tokens, verification rows for the account email and account-change challenges. Shared products/establishments remain. The sole SUPER_ADMIN cannot delete their account. There is no privacy-request inbox in this scope. The super-admin user-management page shows minimal deletion events, not identifiable deleted-account rows. Events are inserted in the same transaction as account deletion, are never reconstructed retrospectively, and expire after `ACCOUNT_DELETION_AUDIT_DAYS` (default 90). This is an operational policy proposal, not a legal retention requirement. Review the purpose and duration before release and keep `/privacidade` consistent with configuration. Day/source/protocol metadata may still be correlated with external logs; absence of direct identifiers is not a guarantee of irreversible anonymization. Credential/session revocation is not account suspension, and the UI does not label active accounts as revoked. If a development database contains tables from the earlier inbox prototype, deletion also removes that account's legacy cases/messages without creating those tables in new databases.

## Backup expiry and restore procedure

Before release, fill in provider, encryption/access owners, frequency, expiry and who verifies expiry. Live deletion does not edit already-created backup snapshots. Restrict snapshots until automatic expiry and ensure exported databases/log copies follow the same approved schedule.

Restore into an isolated environment with outbound mail/import workers disabled. Reconcile all account deletions, scheduled deletions/cancellations and credential revocations since the snapshot using the operator's restricted, expiring deletion/restore reconciliation process. Never restore deleted data to the public service without replaying these actions. Run schema updates and cleanup, verify that deleted users remain absent and old tokens fail, then approve reconnection. This repository does not provide a backup service or an external deletion ledger: the owner must supply that operational mechanism and lifetime before deployment. Document proof of the restore check without retaining unnecessary personal information.

## Validation

Run `python -m unittest discover -s tests -v`, `npm run build --prefix frontend` and `npm run lint --prefix frontend`. The repository-wide lint currently has pre-existing errors in AuthContext (mixed hook/component exports), ImportPage (state in an effect), MapPage and shared/api/errors (explicit any). Targeted lint for the new profile/service/router code reports no errors. The account suite covers credential replacement, legacy sessions, challenge expiry/replay/attempts/ownership/operation isolation, rate limits and delivery failures; concurrent confirmations; account cascades and export exclusions; cleanup boundaries and idempotency; seven-day grace, cancellation/replay, pending-account access denial, SMTP rollback and finalization.

Before release, use a test SMTP service and two separate browser sessions: change email and password, verify the old session is rejected, test recovery, download JSON, schedule deletion and cancel it through the email link. Then schedule again and validate finalization at the deadline in an isolated test database; never change production timestamps to simulate expiry. Confirm SMTP failure shows an error instead of claiming a PIN was sent. Test CAPTCHA lifecycle against SEFAZ separately and repeat concurrency tests on PostgreSQL. The implementation does not configure production scheduling, SMTP or backups for you.
