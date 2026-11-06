import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs } from "@mui/material";
import { api, type ReportStatus } from "../api";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, Loading } from "../components/PageState";
import { ReportStatusChip } from "../components/StatusChip";
import { useAsync } from "../components/useAsync";
import { formatDate } from "../components/format";
import PageHeader from "./PageHeader";

type Filter = "all" | ReportStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "InProgress", label: "In progress" },
  { value: "Returned", label: "Returned" },
  { value: "Submitted", label: "Awaiting review" },
  { value: "Graded", label: "Graded" },
];

export function RunsTable({ runs, showStudent }: { runs: Awaited<ReturnType<typeof api.listReports>>; showStudent: boolean }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="QC runs">
        <TableHead>
          <TableRow>
            <TableCell>Run date</TableCell>
            {showStudent && <TableCell>Student</TableCell>}
            <TableCell>QC material</TableCell>
            <TableCell>Lot</TableCell>
            <TableCell align="right">Results</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Grade</TableCell>
            <TableCell align="right"><span className="sr-only">Open</span></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.reportID} hover>
              <TableCell>{formatDate(r.runDate)}</TableCell>
              {showStudent && <TableCell>{r.studentName}</TableCell>}
              <TableCell sx={{ fontWeight: 600 }}>{r.qcName}</TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>{r.lotNumber}</TableCell>
              <TableCell align="right">{r.analyteInputs.length}/{r.analytes.length}</TableCell>
              <TableCell><ReportStatusChip status={r.status} /></TableCell>
              <TableCell align="right">{r.grade ?? "—"}</TableCell>
              <TableCell align="right">
                <Button size="small" component={RouterLink} to={`/runs/${r.reportID}`} aria-label={`Open ${r.qcName} run from ${formatDate(r.runDate)}${showStudent ? ` by ${r.studentName}` : ""}`}>
                  {r.status === "InProgress" || r.status === "Returned" ? (showStudent ? "View" : "Continue") : "View"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function RunsPage() {
  const { user } = useAuth();
  const faculty = user?.role === "faculty";
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, loading, reload } = useAsync(() => api.listReports(filter === "all" ? {} : { status: filter }), [filter]);

  return (
    <>
      <PageHeader
        title={faculty ? "All QC runs" : "My QC runs"}
        subtitle={faculty ? "Every student run across all lots." : "Runs you have ordered. Continue an open run to enter results and submit it."}
        actions={!faculty && <Button variant="contained" component={RouterLink} to="/order">Order QC</Button>}
      />
      <Tabs value={filter} onChange={(_, v: Filter) => setFilter(v)} variant="scrollable" allowScrollButtonsMobile aria-label="Filter runs by status" sx={{ mb: 2 }}>
        {FILTERS.map((f) => <Tab key={f.value} value={f.value} label={f.label} />)}
      </Tabs>
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && (
        <EmptyState title="No runs here" message={faculty ? "No student runs match this filter." : "Order QC to start a run."}
          action={!faculty && <Button variant="contained" component={RouterLink} to="/order">Order QC</Button>} />
      )}
      {data && data.length > 0 && <RunsTable runs={data} showStudent={faculty} />}
    </>
  );
}
