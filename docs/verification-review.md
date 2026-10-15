# Verification implementation and test notes

Reviewed 2026-10-15. No live database, accounts, seeds, migrations or environment secrets were changed. Changes were subsequently committed locally in separate sections at the user's request. Nothing was pushed.

## Existing implementation map

All frontend paths below are under `app/src/`; backend paths are under `server/src/`.

| Functionality | Frontend | API and backend | Database |
|---|---|---|---|
| Job Seeker submission and ordinary re-request | `screens/jobseeker/VerificationRequestScreen.tsx`, `screens/jobseeker/ProfileScreen.tsx` | `api/verificationRequestsApi.ts` -> `/api/jobseeker/verification-requests` -> `routes/verificationRequests.routes.ts` -> `controllers/verificationRequests.controller.ts` | `VerificationRequest`, `VerifierApplication` |
| Verifier registration | `screens/auth/RegisterScreen.tsx`, `utils/validators.ts`, `context/AuthContext.tsx` | `api/authApi.ts` -> `/api/auth/register` -> `routes/auth.routes.ts`, `validators/auth.validator.ts`, `controllers/auth.controller.ts` | `User`, `VerifierApplication` |
| Verifier reapplication | `screens/verifier/VerifierReapplicationScreen.tsx`, `VerifierApplicationStatusScreen.tsx` | `api/verifierApplicationsApi.ts` -> `/api/verifier/applications` -> `routes/verifierApplications.routes.ts`, `validators/verifierApplication.validator.ts`, `controllers/verifierApplications.controller.ts` | `VerifierApplication` |
| Verifier reactivation | `screens/verifier/VerifierReactivationRequestScreen.tsx`; Admin `IncomingReactivationRequestsScreen.tsx`, `VerifierDetailsScreen.tsx`, `SuspensionHistoryScreen.tsx`, `ReactivationRequestHistoryScreen.tsx` | `api/verifierApplicationsApi.ts` -> verifier self-service and Admin reactivation routes -> `controllers/verifierApplications.controller.ts` | `VerifierApplication`, `VerifierSuspensionEvent`, `VerifierReactivationRequest` |
| Queues, details, approve/reject/flag, availability | `screens/verifier/VerifierDashboardScreen.tsx`, `VerificationQueueScreen.tsx`, `VerificationRequestDetailsScreen.tsx`, `VerifierProfileScreen.tsx` | `api/verificationRequestsApi.ts` -> `/api/verifier/work/*` -> `controllers/verificationRequests.controller.ts` | `VerificationRequest`, `VerifierApplication` |
| Verifier history | `screens/verifier/VerificationHistoryScreen.tsx` | `/api/verifier/work/history` -> `listHistory` | `VerificationRequest` |
| Admin overview, requests and history | `screens/admin/VerificationManagementScreen.tsx`, `AdminVerificationRecordsScreen.tsx`, shared `VerificationRequestDetailsScreen.tsx` | `/api/admin/verification-work/*` -> `controllers/verificationRequests.controller.ts` | `VerificationRequest` |
| Flagged cases, return and confirmation | `screens/admin/FlaggedVerificationCasesScreen.tsx`; `VerificationEmptyStateScreen.tsx` is also wired for the Admin flagged/returned navigation entry | `/api/admin/verification-work/flagged`, `/requests/:id/return`, `/requests/:id/confirm` | `VerificationRequest` |
| Verifier approvals and approval history | `screens/admin/VerifierManagementScreen.tsx`, `VerifierApprovalRequestsScreen.tsx`, `VerifierApplicationDetailScreen.tsx`, `ApprovedVerifiersScreen.tsx`, `SuspendedVerifiersScreen.tsx`, `VerifierApprovalHistoryScreen.tsx`, `VerifierRecordsScreen.tsx`, `VerifierDetailsScreen.tsx` | `api/verifierApplicationsApi.ts` -> `/api/admin/verifier-applications/*` -> `controllers/verifierApplications.controller.ts` | `VerifierApplication` and related reviewer/suspension records |
| Verified Job Seekers, badge revocation, revocation history, incoming re-verification and Admin Allow/Deny | `screens/admin/VerifiedJobSeekerManagementScreen.tsx` handles these navigation modes; Job Seeker `ProfileScreen.tsx`, `VerificationRequestScreen.tsx` | `api/verificationRevocationApi.ts`, `api/verificationRequestsApi.ts` -> `/api/admin/verification-work/*`, Job Seeker `/state` -> `controllers/verificationRevocation.controller.ts`; revoked submissions use `createVerificationRequest` | `VerificationRequest`, `VerificationRevocation`, `User` |
| Navigation and shared types | `navigation/AdminStack.tsx`, `VerifierStack.tsx`, `VerifierWorkNavigator.tsx`, `JobSeekerTabs.tsx`, `types/index.ts` | Existing role/session wiring | Existing relationships retained |
| Private evidence across all these forms | `components/common/DocumentField.tsx` (`DocumentField`, `DocumentEvidence`) | `services/privateDocuments.ts`, route-level `receiveDocuments`, authenticated `/api/private-documents/:id` | References in existing document text fields; bytes in existing private directory |

The database definitions are in `server/prisma/schema.prisma`. SQL writes use `neonSql` and reads use Prisma through `config/db.ts`. Authentication uses the existing auth/role middleware and JWT utilities. No controller state-transition or assignment SQL was edited.

## Actual upload contract

1. Expo DocumentPicker selects JPEG, PNG or PDF. Android retains the system-granted provider URI (`copyToCacheDirectory: false`); iOS keeps a cache copy. These verification fields do not use ImagePicker.
2. Native reads the selected URI using `new File(uri).base64()` from `expo-file-system`. Web reads the browser File/Blob with FileReader. Only requested native cache copies are deleted; Android source documents are never deleted.
3. The form sends `{ name, mimeType, base64 }` under the existing `identityDocumentUpload`, `supportingEvidenceUpload`, `identityDocumentReferenceUpload` or `attachmentReferenceUpload` key.
4. Axios sends JSON with the existing Bearer token. There is no multipart endpoint, FormData conversion or multipart boundary to fix.
5. Express accepts JSON up to 8 MB. Zod validates the form. `receiveDocuments` verifies retained-reference ownership, size, encoding, actual signature, MIME and extension, then writes private files and replaces uploads with `worknest-file:<uuid>` references.
6. Existing controllers persist those references. Authenticated downloads query the current database associations; unrelated users and unassigned/suspended verifiers cannot download them.

`api/http.ts` already supports `EXPO_PUBLIC_API_URL`, browser hostname and Expo `hostUri`, with localhost as the final fallback. No IP or endpoint override was added. Expo tunnel addresses and an explicitly configured unreachable URL can still require a reachable backend URL; neither was established as the reported failure here.

## Compatibility fixes and device diagnosis

The previous frontend rejects a PDF/PNG/JPEG when its provider reports `application/octet-stream`, and rejects the `image/jpg` alias. The shared preparation helper now infers supported types for generic/missing MIME, canonicalizes the JPEG alias and checks metadata before reading. Backend signature and access-control validation remain unchanged. Native cache cleanup runs once after the read attempt.

The subsequently supplied Android screenshot identifies the actual reported failure: `ExponentFileSystem.readAsStringAsync` rejects a file under `file:///data/user/0/host.exp.exponent/cache/DocumentPicker/` as unreadable. This occurs before an upload request. Installed DocumentPicker native code copies into `context.cacheDir`, while the legacy filesystem checks the path through the active project's file-permission service. The path and rejection indicate an Expo Go host-cache/project-scope mismatch.

The fix avoids that cache location on Android: request the original system-granted content URI and read it immediately using the installed current File API, which supports content providers. iOS keeps its cache-copy behavior and uses the same current File reader. The screenshot-specific regression fixture rejects host-cache reads and succeeds only when the original provider URI is read. Legacy upload reads must not be called; Android source files must not be deleted. Backend upload handling, authentication, storage, workflow and API payload are unchanged.

Native API compatibility was checked against installed SDK sources and [Expo FileSystem documentation](https://docs.expo.dev/versions/latest/sdk/filesystem/). Actual physical-device success remains to be confirmed.

Physical Expo Go upload interaction was not available for automated verification.

## Validation changes

| Form/Page | Field | Added or changed validation | Required/Optional |
|---|---|---|---|
| Job Seeker verification/re-verification API | Full Name in personalInformation | Exactly one serialized Full Name line, at least 2 trimmed characters; mirrors the existing form rule | Required, unchanged |
| Job Seeker verification/re-verification API | Address in personalInformation | Exactly one serialized Address line, at least 5 trimmed characters; mirrors the existing form rule | Required, unchanged |
| Job Seeker verification/re-verification form and API | Identity document file | Reject missing/null file uploads (retained uploaded references require ownership); display required label | Required |
| Job Seeker verification/re-verification form | Community References | Check at least 5 trimmed characters before submission; mirrors existing backend validation | Required, unchanged |
| All shared verification upload fields | Filename | Reject blank names and unsupported or MIME-mismatched extensions before reading | Metadata required only when attaching a file |
| All shared verification upload fields | MIME | Normalize case, generic/missing MIME using supported extensions, and image/jpg alias; reject unsupported or conflicting metadata | Metadata required only when attaching a file |
| All shared verification upload fields | Reported file size | Reject zero, negative, nonfinite and over-2-MB sizes before reading | Checked when metadata is supplied |
| All shared verification upload fields | File contents | Reject empty or malformed base64 before submission; retain decoded-size check at 2 MB | Required only when attaching a file |

Existing exact 10-digit mobile validation is unchanged and regression-tested. Identity type/number remain required. Following the user request, Job Seeker verification and re-verification now require an identity file on both frontend and backend. A retained uploaded-file reference remains accepted only after the existing ownership check. Verifier registration and verifier reapplication attachment rules are unchanged. Supporting evidence and reactivation attachments remain optional. No NIC/passport numbering format was invented.

## Test scope and limitations

Use `npm test` or `npm run test:coverage` from `server/`. Both build the server first, then run the existing Node test framework. No dependency or additional framework was installed. No coverage script existed before this change; the new command uses Node's built-in V8 coverage.

Tests run real Express endpoints, JWT authentication/role middleware, validation, storage and downloads, with database calls replaced before application import. The existing Prisma HTTP adapter regression test intercepts SQL transport. Frontend component tests stub React, picker, filesystem and sharing; they verify JavaScript calls and payloads, not native SDK implementation or device permissions. SQL guard assertions and in-memory fixture transitions do not prove PostgreSQL locking, concurrency or live round-robin behavior.

The existing Playwright suite was not executed: its global setup runs `prisma:seed`, and its tests register accounts and write live data, contrary to this task's restrictions. Email test scripts were not run because they send mail. No lint script is configured in the app/server manifests.

Remaining coverage gaps include controller exception paths, some availability/mine endpoints, browser document download handling and UI rendering. Coverage scope is the modules selected in the script, not the whole application or every verification screen. Backend metrics refer to built JavaScript. Frontend metrics use transpilation source maps; Node can mark TypeScript interfaces/imports/comments uncovered even when all helper functions/branches ran. Statements are not provided by this coverage tool.

## Manual device check still needed

Reload the updated bundle in Expo Go using existing authorized accounts. Test a small PDF, PNG and JPEG, cancel, replace/remove, reject an over-2-MB file, omit supporting evidence, submit, then retrieve as owner/assigned approved verifier/Admin. Confirm another user cannot retrieve it. Record actual device results separately from mocked automated tests. No new accounts or data-reset/seed step is needed. The supplied screenshot already captures the Android legacy-reader rejection; capture any different error if a device retry still fails.

## Final checks and coverage

- Existing baseline: 14 tests passed before edits.
- Final suite/coverage after the screenshot fix: 29 tests passed, 0 failed, 0 skipped.
- After the verifier confirmation UI change: all 33 tests passed, frontend typecheck and backend build passed. Coverage figures below are from the preceding 29-test coverage run.
- Frontend `npm run typecheck`: PASS.
- Backend `npm run typecheck`, `npm run build`: PASS.
- Frontend `npx expo export --platform web`: PASS (output in ignored `app/dist`).
- Frontend `npx expo export --platform android`: PASS (bundle generation only, not physical-device testing).
- Final diff whitespace check: PASS.
- Statements: unavailable from Node's built-in coverage.

| Module (backend names refer to dist output) | Lines | Branches | Functions |
|---|---:|---:|---:|
| Selected modules total | 91.75% | 83.25% | 91.84% |
| DocumentField.tsx | 84.78% | 64.91% | 76.92% |
| documentUpload.ts | 75.00% | 100.00% | 100.00% |
| Frontend validators.ts | 100.00% | 90.00% | 75.00% |
| verificationRequests.controller.js | 81.42% | 83.17% | 94.12% |
| verificationRevocation.controller.js | 93.24% | 74.19% | 100.00% |
| verifierApplications.controller.js | 92.98% | 73.68% | 100.00% |
| privateDocuments.js | 100.00% | 91.67% | 93.33% |
| auth.validator.js | 100.00% | 100.00% | 66.67% |
| verificationDocuments.js | 100.00% | 100.00% | 100.00% |
| verificationRequest.validator.js | 100.00% | 100.00% | 100.00% |
| verifierApplication.validator.js | 100.00% | 100.00% | 100.00% |

Normal verification, ordinary re-request, assignment/controller scoping, approve, reject, flag, Admin overview/requests/history/confirmation, badge revocation/history, Admin re-verification Allow/Deny, verifier rejection after Allow, subsequent re-request, and document access control: PASS in the isolated automated suite. Database SQL execution/concurrency and physical devices were not tested.

## Files changed

| File | Purpose |
|---|---|
| app/src/utils/documentUpload.ts | Shared upload metadata preparation/validation retaining the JSON contract |
| app/src/components/common/DocumentField.tsx | Use preparation helper; read Android provider URIs with the current File API; clean only requested cache copies |
| app/src/screens/jobseeker/VerificationRequestScreen.tsx | Validate existing community-reference minimum before submit |
| app/src/screens/verifier/VerificationRequestDetailsScreen.tsx | Reveal the action-specific reason after Reject/Flag is selected; submit the existing action only on confirmation; Cancel submits nothing |
| server/src/validators/verificationRequest.validator.ts | Mirror existing frontend name/address requirements |
| server/package.json | Expose existing Node tests and built-in coverage through npm scripts |
| server/tests/helpers/loadFrontend.cjs | Source-mapped TypeScript/TSX loader with isolated frontend dependency stubs |
| server/tests/mobileDocumentUpload.test.cjs | Native/web preparation, metadata, URI forwarding, cancel/failure/cleanup and native authenticated retrieval |
| server/tests/verifierApplications.test.cjs | Application administration, reapplication, acknowledgement and reactivation guards |
| server/tests/verifierDecisionUi.test.cjs | Confirm/cancel behavior, unchanged payloads/API validation, existing approval/start controls and role/status restrictions |
| server/tests/adminVerificationLists.test.cjs | Add overview, statistics, dashboard and missing-record checks |
| server/tests/verificationRevocation.test.cjs | Add invalid/stale decisions, ownership, ordinary confirmation and retry regressions; align address fixture with actual form |
| server/tests/verificationValidation.test.cjs | Required fields and decision-reason tests; use shared frontend loader; align address fixture |
| server/tests/privateDocuments.test.cjs | Align valid fixtures with the existing frontend address requirement |
| docs/verification-review.md | Implementation map, contract trace, results, limits and manual checks |

Schema changed: NO. Migration created: NO. Real database data changed: NO. Commits: separate local commits authorized by the user after implementation. Push: NO. Authentication, document access-control, protected accounts, secrets, lifecycle, district/round-robin SQL, badge revocation and re-verification controllers are unchanged.
