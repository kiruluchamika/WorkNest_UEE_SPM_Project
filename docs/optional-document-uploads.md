# Optional verification document uploads

All image/document fields remain optional. No unrelated required fields, approval decisions, assignment logic, suspension history, reactivation rules, statistics or workflow statuses were changed. No commit or push was made.

## Audit and implementation

| Form / field | Before | Implemented transport endpoint | Optional |
| --- | --- | --- | --- |
| Community Verifier registration: `identityDocumentReference` | Text input, fabricated reference metadata; no file bytes | POST `/api/auth/register` | Yes |
| Verifier reapplication: `identityDocumentReference` | Text input; reused previous reference | POST `/api/verifier/applications` | Yes |
| Job Seeker verification: `identityDocument` | Concatenated identity type/number only; no file picker | POST `/api/jobseeker/verification-requests` | Yes |
| Job Seeker verification: `supportingEvidence` | Free text only | Same endpoint | Yes |
| Verifier reactivation: `attachmentReference` | Text input; explicitly did not upload | POST `/api/verifier/applications/reactivation-request` | Yes |

No field in this scope already had a complete upload implementation. Existing shared `ImagePickerField` / `imagePicker` utilities upload compressed JPEG data URIs for gig/profile photos; those working features were left unchanged. They store photo content in publicly presented fields, so they are unsuitable for private identity evidence. Address/supporting information and community references remain text; these are not separate document fields. Identity type/number and written Job Seeker evidence are preserved alongside the new file reference.

## Picker, transport, storage and retrieval

- Shared `DocumentField` uses Expo DocumentPicker on web/native, displays the selected filename, and supports removal/replacement before submission. Cancelling or rejecting a selection does not replace the previous selection.
- Files travel as `{name, mimeType, base64}` in an optional `<existingField>Upload` property on the existing JSON form request. No separate public or anonymous upload endpoint was added. Files are only stored on form submission.
- JPEG (`.jpg`/`.jpeg`), PNG (`.png`) and PDF (`.pdf`), maximum **2 MiB per file**. Backend checks size, strict base64, extension, MIME and byte signature; PDF also needs an EOF marker. The UI applies type/size limits and shows errors. The existing 8 MB JSON request cap accommodates both Job Seeker files.
- Server stores each file as a private JSON envelope (sanitized filename, detected MIME and base64 bytes), under a random UUID filename in `PRIVATE_DOCUMENT_DIR`, defaulting to `private-documents` relative to server working directory. This directory is gitignored and never mounted as static content. POSIX modes request directory 0700/file 0600; Windows deployments must restrict the directory with filesystem ACLs.
- Existing string columns hold `worknest-file:<uuid>`; existing text is retained. No schema changes or migrations were necessary. No database operations were run against the configured real database.
- GET `/api/private-documents/:id` returns file bytes only after JWT authentication and a current database association check. Owners and admins may retrieve their permitted files. For Job Seeker evidence, the currently assigned verifier must also have an APPROVED verifier application. Unassigned/suspended verifiers and unrelated users cannot download. An ID alone grants no access.
- Reusing a reference in a new form requires ownership; anonymous registration cannot reuse an existing private reference. File paths are generated server-side and retrieval accepts UUIDs only. Downloads use attachment disposition, `no-store`, `nosniff` and a sandbox CSP. No public URL or token in a URL is created.
- `DocumentEvidence` adds download/open actions to admin application details, verifier management details, reactivation history, flagged cases, verifier request details/status and Job Seeker profile. Native uses the system sharing/open sheet and deletes temporary download files afterward; web uses an authenticated blob download and revokes the object URL. Legacy text is displayed as text, never opened as a URL or misrepresented as an uploaded file.
- Failed requests remove newly written files after confirming they are not associated with a committed record. If the database is unavailable during cleanup, files are retained rather than risking deletion of committed evidence.

## Validation results

`npm run typecheck` passed in both app and server. `npm run build` passed in server. `npx expo export --platform web` passed. `git diff --check` passed. Prisma validation was not needed because schema/migrations were untouched.

`npm run build` then `node --test tests/privateDocuments.test.cjs` in server: **7 tests passed**, including actual HTTP requests through all four existing form routes/controllers, real private filesystem writes and authenticated downloads. Database methods were replaced by isolated in-memory fixtures; this is not a live PostgreSQL end-to-end test.

| Case | Result |
| --- | --- |
| No attachment, all four forms | HTTP 201 |
| Valid PNG and PDF, all five upload fields | HTTP 201; reference persisted in fixture; downloaded PNG bytes match input |
| Removed selection payload | HTTP 201 without upload |
| Replacement payload | HTTP 201; only final PDF associated |
| Executable/invalid file | HTTP 400 |
| More than 2 MiB | HTTP 413 |
| Invalid base64 or MIME mismatch | Rejected |
| JPEG signature path | Passed validation test |
| Anonymous download | HTTP 401 |
| Unrelated user, unassigned verifier, suspended assigned verifier | HTTP 404 |
| Owner, admin, active assigned verifier | HTTP 200 |
| Attaching someone else's reference | HTTP 403 |
| Workflow rejects submission | HTTP 409; unassociated new file cleaned up |
| `/health` in test server | HTTP 200 |

Temporary filesystem fixtures were removed. No real accounts or database records were created, updated or deleted. No destructive database command was used.

## Deployment and remaining limitations

- Configure an absolute `PRIVATE_DOCUMENT_DIR` on durable private storage, restrict it to the server account, and back it up with the database. Multiple API instances need shared durable storage. Ephemeral hosting needs a private persistent volume or a future private object-storage adapter.
- Use the deployed API's HTTPS configuration. Local development keeps the project's existing HTTP setup.
- Native picker/system viewer interaction and browser chooser clicks were not exercised on devices; remove/replace assertions cover submitted request payloads. A native app rebuild may be needed for the added Expo modules/config plugin. Live database persistence was not tested.
- Validation is an allowlist and signature check, not antivirus scanning or full document parsing. PDF files may contain active content; the API forces download instead of embedding them in WorkNest. Files should be opened with a maintained viewer.
- A process crash between disk write and database commit can leave an inaccessible orphan. Failed cleanup during outages also needs later reconciliation. No historical files/records were purged.
- Existing references do not retroactively become files; those users must select and submit an actual file in an available form.
- Dependency installation reported 15 moderate advisories in the app dependency tree; no unrelated forced dependency upgrades were made. The project ignores `app/package-lock.json`; installation updated that local ignored file.

Expo references: [DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/) and [Sharing](https://docs.expo.dev/versions/latest/sdk/sharing/).

## Files changed

- `.gitignore`
- `app/app.config.ts`
- `app/package.json`
- `app/src/api/authApi.ts`
- `app/src/api/verificationRequestsApi.ts`
- `app/src/api/verifierApplicationsApi.ts`
- `app/src/context/AuthContext.tsx`
- `app/src/screens/admin/FlaggedVerificationCasesScreen.tsx`
- `app/src/screens/admin/ReactivationRequestHistoryScreen.tsx`
- `app/src/screens/admin/VerifierApplicationDetailScreen.tsx`
- `app/src/screens/admin/VerifierDetailsScreen.tsx`
- `app/src/screens/auth/RegisterScreen.tsx`
- `app/src/screens/jobseeker/ProfileScreen.tsx`
- `app/src/screens/jobseeker/VerificationRequestScreen.tsx`
- `app/src/screens/verifier/VerificationRequestDetailsScreen.tsx`
- `app/src/screens/verifier/VerifierApplicationStatusScreen.tsx`
- `app/src/screens/verifier/VerifierReactivationRequestScreen.tsx`
- `app/src/screens/verifier/VerifierReapplicationScreen.tsx`
- `app/src/types/index.ts`
- `server/src/app.ts`
- `server/src/middleware/error.middleware.ts`
- `server/src/routes/auth.routes.ts`
- `server/src/routes/verificationRequests.routes.ts`
- `server/src/routes/verifierApplications.routes.ts`
- `server/src/validators/auth.validator.ts`
- `server/src/validators/verificationRequest.validator.ts`
- `server/src/validators/verifierApplication.validator.ts`
- `app/src/components/common/DocumentField.tsx`
- `server/src/services/privateDocuments.ts`
- `server/tests/privateDocuments.test.cjs`
- `docs/optional-document-uploads.md`
