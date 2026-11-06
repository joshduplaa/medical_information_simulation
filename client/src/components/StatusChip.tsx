import { Chip } from "@mui/material";
import type { ReportStatus } from "../api";
import type { QcStatus } from "../qc/westgard";

const REPORT: Record<ReportStatus, { label: string; color: "default" | "info" | "warning" | "success" }> = {
  InProgress: { label: "In progress", color: "default" },
  Submitted: { label: "Awaiting review", color: "info" },
  Returned: { label: "Returned", color: "warning" },
  Graded: { label: "Graded", color: "success" },
};

export function ReportStatusChip({ status }: { status: ReportStatus }) {
  const s = REPORT[status];
  return <Chip size="small" label={s.label} color={s.color} variant={status === "InProgress" ? "outlined" : "filled"} />;
}

const QC: Record<QcStatus, { label: string; color: "success" | "warning" | "error" }> = {
  ok: { label: "In control", color: "success" },
  warning: { label: "Warning", color: "warning" },
  reject: { label: "Reject", color: "error" },
};

export function QcStatusChip({ status, rules }: { status: QcStatus; rules?: string[] }) {
  const s = QC[status];
  const label = rules && rules.length ? `${s.label}: ${rules.join(", ")}` : s.label;
  return <Chip size="small" label={label} color={s.color} variant="outlined" />;
}
