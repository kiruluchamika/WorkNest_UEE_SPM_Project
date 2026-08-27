export function formatYesNo(value: boolean | undefined): string {
  return value ? "Yes" : "No";
}

export function formatAnswerValue(answer: string | boolean | string[]): string {
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (Array.isArray(answer)) return answer.join(", ");
  return answer;
}
