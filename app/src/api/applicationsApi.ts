import { http, extractErrorMessage } from "./http";
import type { ApplicantGigSummary, JobApplication, SubmitApplicationPayload } from "../types";

export async function getGigForApplicant(gigId: string): Promise<ApplicantGigSummary> {
  try {
    const { data } = await http.get(`/applications/gigs/${gigId}`);
    return data.gig;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this gig."));
  }
}

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
