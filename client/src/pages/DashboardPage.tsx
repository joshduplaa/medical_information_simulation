import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardActionArea, CardContent, Grid2 as Grid, Paper, Stack, Typography } from "@mui/material";
import { api, type QcLot, type Report } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ErrorState, Loading } from "../components/PageState";
import { ReportStatusChip } from "../components/StatusChip";
import { useAsync } from "../components/useAsync";
import { formatDate } from "../components/format";
import PageHeader from "./PageHeader";

function Stat({ label, value, to }: { label: string; value: number | string; to: string }) {
  return (
    <Card>
      <CardActionArea component={RouterLink} to={to} sx={{ p: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography sx={{ fontSize: 32, fontWeight: 700, color: "primary.main" }}>{value}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function RunList({ title, runs, empty }: { title: string; runs: Report[]; empty: string }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h2" component="h2" sx={{ mb: 1 }}>{title}</Typography>
      {runs.length === 0 ? (
        <Typography color="text.secondary">{empty}</Typography>
      ) : (
        <Stack divider={<Box sx={{ borderTop: "1px solid #E6ECF2" }} />}>
          {runs.slice(0, 6).map((r) => (
            <Stack key={r.reportID} direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>{r.qcName}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{r.studentName} · Lot {r.lotNumber} · {formatDate(r.runDate)}</Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <ReportStatusChip status={r.status} />
                <Button size="small" component={RouterLink} to={`/runs/${r.reportID}`} aria-label={`Open ${r.qcName} run from ${formatDate(r.runDate)}${r.studentName ? ` by ${r.studentName}` : ""}`}>Open</Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const faculty = user?.role === "faculty";
  const { data, error, loading, reload } = useAsync(
    () => Promise.all([api.listReports(), api.listLots()]) as Promise<[Report[], QcLot[]]>,
    [],
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.firstname}`}
        subtitle={faculty ? "Manage QC lots and review student QC runs." : "Order QC, enter results, and track your grades."}
        actions={faculty
          ? <Button variant="contained" component={RouterLink} to="/lots/new">New QC lot</Button>
          : <Button variant="contained" component={RouterLink} to="/order">Order QC</Button>}
      />
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (() => {
        const [runs, lots] = data;
        const count = (s: Report["status"]) => runs.filter((r) => r.status === s).length;
        const graded = runs.filter((r) => r.status === "Graded" && r.grade != null);
        const avg = graded.length ? Math.round(graded.reduce((t, r) => t + (r.grade ?? 0), 0) / graded.length) : "—";
        return (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              {faculty ? (
                <>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Awaiting review" value={count("Submitted")} to="/review" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Active QC lots" value={lots.filter((l) => l.isActive).length} to="/lots" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Graded runs" value={graded.length} to="/gradebook" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Class average" value={avg} to="/gradebook" /></Grid>
                </>
              ) : (
                <>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="In progress" value={count("InProgress")} to="/runs" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Returned to you" value={count("Returned")} to="/runs" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Awaiting review" value={count("Submitted")} to="/runs" /></Grid>
                  <Grid size={{ xs: 6, md: 3 }}><Stat label="Average grade" value={avg} to="/gradebook" /></Grid>
                </>
              )}
            </Grid>
            {faculty ? (
              <RunList title="Waiting for your review" runs={runs.filter((r) => r.status === "Submitted")} empty="Nothing to review right now." />
            ) : (
              <RunList title="Needs your attention" runs={runs.filter((r) => r.status === "InProgress" || r.status === "Returned")} empty="No open runs. Order QC to start one." />
            )}
          </Stack>
        );
      })()}
    </>
  );
}
