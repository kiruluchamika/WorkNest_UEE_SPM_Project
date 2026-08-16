import { http, extractErrorMessage } from "./http";
import type { ApplicationMode, ApplicationQuestion, ApplicationRequirements, ApplicationSettings } from "../types";

export interface ApplicationSettingsPayload {
  applicationMode: ApplicationMode;
  requirements: ApplicationRequirements;
  customQuestions: ApplicationQuestion[];
}

export async function getApplicationSettings(gigId: string): Promise<ApplicationSettings | null> {
  try {
    const { data } = await http.get(`/application-settings/${gigId}`);
    return data.settings;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load application settings."));
  }
}

export async function getPublicApplicationSettings(gigId: string): Promise<ApplicationSettings | null> {
  try {
    const { data } = await http.get(`/application-settings/${gigId}/public`);
    return data.settings;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not load this gig's application requirements."));
  }
}

export async function createApplicationSettings(
  gigId: string,
  payload: ApplicationSettingsPayload
): Promise<ApplicationSettings> {
  try {
    const { data } = await http.post(`/application-settings/${gigId}`, payload);
    return data.settings;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not save application settings."));
  }
}

export async function updateApplicationSettings(
  gigId: string,
  payload: ApplicationSettingsPayload
): Promise<ApplicationSettings> {
  try {
    const { data } = await http.put(`/application-settings/${gigId}`, payload);
    return data.settings;
  } catch (err) {
    throw new Error(extractErrorMessage(err, "Could not save application settings."));
  }
}
