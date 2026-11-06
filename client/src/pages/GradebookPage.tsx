import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Button, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { api } from "../api";
import { summarize } from "../lib/gradebook";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, Loading } from "../components/PageState";
import { useAsync } from "../components/useAsync";
import { formatDate } from "../components/format";
import PageHeader from "./PageHeader";


export default function GradebookPage() {
  const { user } = useAuth();
  const faculty = user?.role === "faculty";
  const [student, setStudent] = useState("all");
  const { data, error, loading, reload } = useAsync(() => api.listReports({ status: "Graded" }), []);
  const summaries = useMemo(() => summarize(data ?? []), [data]);
  const rows = (data ?? []).filter((r) => student === "all" || r.studentID === student);
  const mine = !faculty && summaries[0];

  return (
    <>
      <PageHeader
        title="Gradebook"
        subtitle={faculty ? "Grades for every reviewed QC run." : "Your graded QC runs and instructor feedback."}
        actions={<Button onClick={() => window.print()}>Print</Button>}
      />
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No grades yet" message={faculty ? "Grade submitted runs from the review queue." : "Grades appear here after your instructor reviews a submitted run."} />}
      {data && data.length > 0 && (
        <Stack spacing={3}>
          {faculty ? (
            <TableContainer component={Paper}>
              <Table aria-label="Student averages">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell align="right">Graded runs</TableCell>
                    <TableCell align="right">Average</TableCell>
                    <TableCell>Last reviewed</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {summaries.map((s) => (
                    <TableRow key={s.studentID} hover selected={student === s.studentID} onClick={() => setStudent(s.studentID)} sx={{ cursor: "pointer" }}>
                      <TableCell sx={{ fontWeight: 600 }}>{s.name}</TableCell>
                      <TableCell align="right">{s.count}</TableCell>
                      <TableCell align="right">{s.average}</TableCell>
                      <TableCell>{formatDate(s.latest)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : mine && (
            <Paper sx={{ p: 3 }}>
              <Typography color="text.secondary">Average across {mine.count} graded run{mine.count === 1 ? "" : "s"}</Typography>
              <Typography sx={{ fontSize: 40, fontWeight: 700, color: "primary.main" }}>{mine.average}</Typography>
            </Paper>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
            <Typography variant="h2" component="h2">Graded runs</Typography>
            {faculty && (
              <TextField select size="small" label="Student" value={student} onChange={(e) => setStudent(e.target.value)} sx={{ minWidth: 220 }}>
                <MenuItem value="all">All students</MenuItem>
                {summaries.map((s) => <MenuItem key={s.studentID} value={s.studentID}>{s.name}</MenuItem>)}
              </TextField>
            )}
          </Stack>
          <TableContainer component={Paper}>
            <Table aria-label="Graded runs">
              <TableHead>
                <TableRow>
                  <TableCell>Run date</TableCell>
                  {faculty && <TableCell>Student</TableCell>}
                  <TableCell>QC material</TableCell>
                  <TableCell align="right">Grade</TableCell>
                  <TableCell>Feedback</TableCell>
                  <TableCell align="right"><span className="sr-only">Open</span></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.reportID} hover>
                    <TableCell>{formatDate(r.runDate)}</TableCell>
                    {faculty && <TableCell>{r.studentName}</TableCell>}
                    <TableCell>{r.qcName} <Typography component="span" variant="body2" color="text.secondary">({r.lotNumber})</Typography></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{r.grade}</TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>{r.facultyComment || "—"}</TableCell>
                    <TableCell align="right"><Button size="small" component={RouterLink} to={`/runs/${r.reportID}`}>View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
    </>
  );
}
