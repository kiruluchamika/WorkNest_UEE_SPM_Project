import { http, extractErrorMessage } from "./http";
import type { JobSeekerVerificationDetails, VerificationRequest, VerificationRevocation } from "../types";
const base = "/admin/verification-work";
export async function listVerifiedJobSeekers(district = ""): Promise<VerificationRequest[]> {
  try { return (await http.get(`${base}/verified-jobseekers`, { params: { district } })).data.requests; }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not load verified Job Seekers.")); }
}
export async function listRevocations(): Promise<VerificationRevocation[]> {
  try { return (await http.get(`${base}/revocations`)).data.revocations; }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not load revocation history.")); }
}
export async function listGateRequests(): Promise<VerificationRequest[]> {
  try { return (await http.get(`${base}/admin-gate`)).data.requests; }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not load Admin review requests.")); }
}
export async function getJobSeekerVerificationDetails(userId: string): Promise<JobSeekerVerificationDetails> {
  try { return (await http.get(`${base}/jobseekers/${userId}`)).data; }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not load verification details.")); }
}
export async function revokeVerificationBadge(id: string, reason: string) {
  try { await http.post(`${base}/requests/${id}/revoke`, { reason }); }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not revoke verification badge.")); }
}
export async function decideVerificationGate(id: string, allow: boolean, reason?: string) {
  try { await http.post(`${base}/admin-gate/${id}/${allow ? "allow" : "deny"}`, { reason }); }
  catch (e) { throw new Error(extractErrorMessage(e, "Could not review verification request.")); }
}
