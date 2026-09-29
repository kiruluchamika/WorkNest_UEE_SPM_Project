import { http, extractErrorMessage } from "./http";
import type { VerifierApplication, VerifierApplicationPayload, VerifierApplicationStatus, VerifierReactivationRequest } from "../types";

export async function listApplications(status: VerifierApplicationStatus = "PENDING"): Promise<VerifierApplication[]> {
  try { const { data } = await http.get("/admin/verifier-applications", { params: { status } }); return data.applications; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not load verifier applications.")); }
}
export async function getApplication(id: string): Promise<VerifierApplication> {
  try { const { data } = await http.get(`/admin/verifier-applications/${id}`); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not load verifier application.")); }
}
export async function approveApplication(id: string): Promise<VerifierApplication> {
  try { const { data } = await http.patch(`/admin/verifier-applications/${id}/approve`); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not approve verifier application.")); }
}
export async function rejectApplication(id: string, reason: string): Promise<VerifierApplication> {
  try { const { data } = await http.patch(`/admin/verifier-applications/${id}/reject`, { reason }); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not reject verifier application.")); }
}
export async function suspendApplication(id: string, reason: string): Promise<VerifierApplication> {
  try { const { data } = await http.patch(`/admin/verifier-applications/${id}/suspend`, { reason }); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not suspend verifier.")); }
}
export async function getLatestApplication(): Promise<VerifierApplication> {
  try { const { data } = await http.get("/verifier/applications/latest"); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not load your verifier application.")); }
}
export async function acknowledgeApproval(id: string): Promise<VerifierApplication> {
  try { const { data } = await http.patch(`/verifier/applications/${id}/acknowledge-approval`); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not continue to the verifier dashboard.")); }
}
export async function submitReapplication(payload: VerifierApplicationPayload): Promise<VerifierApplication> {
  try { const { data } = await http.post("/verifier/applications", payload); return data.application; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not submit verifier re-application.")); }
}
export async function getLatestReactivationRequest(): Promise<VerifierReactivationRequest | null> {
  try { const { data } = await http.get("/verifier/applications/reactivation-request/latest"); return data.request; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not load reactivation request.")); }
}
export async function submitReactivationRequest(explanation: string, attachmentReference?: string, attachmentReferenceUpload?: import("../components/common/DocumentField").DocumentUpload): Promise<VerifierReactivationRequest> {
  try { const { data } = await http.post("/verifier/applications/reactivation-request", { explanation, attachmentReferenceUpload, attachmentReference: attachmentReference || undefined, attachmentMetadata: attachmentReference ? { displayName: attachmentReference } : undefined }); return data.request; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not submit reactivation request.")); }
}
export async function approveReactivationRequest(id: string): Promise<VerifierReactivationRequest> {
  try { const { data } = await http.patch(`/admin/verifier-applications/reactivation-requests/${id}/approve`); return data.request; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not approve reactivation request.")); }
}
export async function rejectReactivationRequest(id: string, reason: string): Promise<VerifierReactivationRequest> {
  try { const { data } = await http.patch(`/admin/verifier-applications/reactivation-requests/${id}/reject`, { reason }); return data.request; }
  catch (error) { throw new Error(extractErrorMessage(error, "Could not reject reactivation request.")); }
}
