import type { Report } from "../api";

export interface StudentSummary { studentID: string; name: string; count: number; average: number; latest: string }

export function summarize(graded: Report[]): StudentSummary[] {
  const by = new Map<string, Report[]>();
  for (const r of graded) by.set(r.studentID, [...(by.get(r.studentID) ?? []), r]);
  return [...by.entries()]
    .map(([studentID, runs]) => ({
      studentID,
      name: runs[0].studentName,
      count: runs.length,
      average: Math.round((runs.reduce((t, r) => t + (r.grade ?? 0), 0) / runs.length) * 10) / 10,
      latest: runs.map((r) => r.reviewedDate ?? r.runDate).sort().at(-1)!,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
