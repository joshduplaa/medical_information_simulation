const dateFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
export const departmentLabel = (d: string) => d.replace(/_/g, " ");

/** Value formatted with enough decimals for the analyte's SD (e.g. creatinine 1.02, sodium 140.3). */
export function formatValue(value: number, sd: number): string {
  const decimals = sd < 0.2 ? 2 : sd < 2 ? 1 : 0;
  return value.toFixed(Math.max(decimals, 1));
}
