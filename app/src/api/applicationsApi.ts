import { http, extractErrorMessage } from "./http";
import type {
  ApplicationDetail,
  GigApplicantListItem,
  JobApplication,
  MyApplicationListItem,
  SubmitApplicationPayload,
} from "../types";

export async function checkExistingApplication(
  gigId: string
): Promise<{ applied: boolean; application: JobApplication | null }> {
  try {
    const { data } = await http.get(`/applications/check/${gigId}`);
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not check your application status."));
  }
}

export async function submitApplication(payload: SubmitApplicationPayload): Promise<JobApplication> {
  try {
    const { data } = await http.post(`/applications`, payload);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not submit your application."));
  }
}

export async function getMyApplications(): Promise<MyApplicationListItem[]> {
  try {
    const { data } = await http.get(`/applications`);
    return data.applications;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load your applications."));
  }
}

export async function getApplicationById(applicationId: string): Promise<ApplicationDetail> {
  try {
    const { data } = await http.get(`/applications/${applicationId}`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this application."));
  }
}

export async function withdrawApplication(applicationId: string): Promise<JobApplication> {
  try {
    const { data } = await http.patch(`/applications/${applicationId}/withdraw`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not withdraw this application."));
  }
}

export async function getGigApplicants(gigId: string): Promise<GigApplicantListItem[]> {
  try {
    const { data } = await http.get(`/applications/gig/${gigId}`);
    return data.applications;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load applicants for this gig."));
  }
}

export async function shortlistApplication(applicationId: string): Promise<JobApplication> {
  try {
    const { data } = await http.patch(`/applications/${applicationId}/shortlist`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not shortlist this applicant."));
  }
}

export async function rejectApplication(applicationId: string): Promise<JobApplication> {
  try {
    const { data } = await http.patch(`/applications/${applicationId}/reject`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not reject this applicant."));
  }
}

export async function hireApplication(applicationId: string): Promise<JobApplication> {
  try {
    const { data } = await http.patch(`/applications/${applicationId}/hire`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not hire this applicant."));
  }
}

export async function completeApplication(applicationId: string): Promise<JobApplication> {
  try {
    const { data } = await http.patch(`/applications/${applicationId}/complete`);
    return data.application;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not mark this application as completed."));
  }
}
