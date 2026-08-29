import { http, extractErrorMessage } from "./http";

export async function getDistricts(): Promise<string[]> {
  try {
    const { data } = await http.get<{ districts: string[] }>("/districts");
    return data.districts;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "Could not load districts."));
  }
}
