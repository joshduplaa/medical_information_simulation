import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, AlertTitle, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid2 as Grid,
  InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import { api, type LjSeries, type Report } from "../api";
import { useAuth } from "../auth/AuthContext";
import LeveyJenningsChart from "../components/LeveyJenningsChart";
import { ErrorState, Loading } from "../components/PageState";
import { QcStatusChip, ReportStatusChip } from "../components/StatusChip";
import { departmentLabel, formatDate, formatDateTime, formatValue } from "../components/format";
import { formatZ, singleValueRules, statusOf, zScore } from "../qc/westgard";
import PageHeader from "./PageHeader";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function ResultsEntry({ report, onSaved }: { report: Report; onSaved: (r: Report) => void }) {
  const navigate = useNavigate();
  const initial = useMemo(
    () => Object.fromEntries(report.analytes.map((a) => [a.analyteID, report.analyteInputs.find((i) => i.analyteID === a.analyteID)?.analyteValue.toString() ?? ""])),
    [report],
  );
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [comment, setComment] = useState(report.studentComment ?? "");
  const [runDate, setRunDate] = useState(toLocalInput(report.runDate));
  const [busy, setBusy] = useState<"save" | "submit" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const parsed = report.analytes.map((a) => {
    const raw = values[a.analyteID]?.trim() ?? "";
    const value = raw === "" ? NaN : Number(raw);
    return { analyte: a, raw, value, invalid: raw !== "" && !Number.isFinite(value) };
  });
  const filled = parsed.filter((p) => p.raw !== "" && !p.invalid);
  const anyInvalid = parsed.some((p) => p.invalid);
  const complete = filled.length === report.analytes.length;

  async function persist() {
    return api.saveResults(
      report.reportID,
      filled.map((p) => ({ analyteID: p.analyte.analyteID, analyteValue: p.value })),
      comment,
      runDate ? new Date(runDate).toISOString() : undefined,
    );
  }

  async function save() {
    setBusy("save"); setError(null); setSaved(false);
    try { onSaved(await persist()); setSaved(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setBusy(null); }
  }

  async function submit() {
    setBusy("submit"); setError(null);
    try {
      await persist();
      onSaved(await api.submitRun(report.reportID));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    setBusy("discard");
    try {
      await api.discardRun(report.reportID);
      navigate("/runs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discard failed.");
      setBusy(null);
      setConfirmDiscard(false);
    }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} component="section" aria-labelledby="entry-title">
      <Typography id="entry-title" variant="h2" component="h2" sx={{ mb: 0.5 }}>Enter results</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter the value the analyzer reported for each analyte. The z-score and Westgard 1-2s/1-3s check update as you type;
        multi-run rules appear on the Levey-Jennings charts below once you save.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
      {saved && !error && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>Draft saved.</Alert>}

      <TableContainer>
        <Table size="small" aria-label="Result entry">
          <TableHead>
            <TableRow>
              <TableCell>Analyte</TableCell>
              <TableCell sx={{ minWidth: 150 }}>Result</TableCell>
              <TableCell>Target (mean ± SD)</TableCell>
              <TableCell>Acceptable range</TableCell>
              <TableCell align="right">z-score</TableCell>
              <TableCell>Check</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parsed.map(({ analyte: a, raw, value, invalid }) => {
              const z = Number.isFinite(value) ? zScore(value, a.mean, a.stdDevi) : NaN;
              const rules = singleValueRules(z);
              return (
                <TableRow key={a.analyteID}>
                  <TableCell>
                    <Typography fontWeight={600}>{a.analyteAcronym}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.analyteName}</Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" value={raw} error={invalid} helperText={invalid ? "Not a number" : undefined}
                      onChange={(e) => setValues((v) => ({ ...v, [a.analyteID]: e.target.value }))}
                      slotProps={{
                        htmlInput: { inputMode: "decimal", "aria-label": `${a.analyteName} result (${a.unitOfMeasure})` },
                        input: { endAdornment: <InputAdornment position="end">{a.unitOfMeasure}</InputAdornment> },
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatValue(a.mean, a.stdDevi)} ± {a.stdDevi}</TableCell>
                  <TableCell>{a.minLevel} – {a.maxLevel}</TableCell>
                  <TableCell align="right">{formatZ(z)}</TableCell>
                  <TableCell>{Number.isFinite(z) ? <QcStatusChip status={statusOf(rules)} rules={rules} /> : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 5, md: 4 }}>
          <TextField label="Run date and time" type="datetime-local" value={runDate} onChange={(e) => setRunDate(e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 7, md: 8 }}>
          <TextField label="Comments for your instructor (optional)" value={comment} onChange={(e) => setComment(e.target.value)} fullWidth multiline minRows={1}
            placeholder="e.g. corrective action taken, analyzer used" slotProps={{ htmlInput: { maxLength: 2000 } }} />
        </Grid>
      </Grid>

      <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ mt: 2 }} justifyContent="flex-end">
        {report.status === "InProgress" && (
          <Button color="error" onClick={() => setConfirmDiscard(true)} disabled={busy !== null}>Discard run</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={save} disabled={busy !== null || anyInvalid || filled.length === 0}>{busy === "save" ? "Saving…" : "Save draft"}</Button>
        <Button variant="contained" onClick={submit} disabled={busy !== null || anyInvalid || !complete}>
          {busy === "submit" ? "Submitting…" : report.status === "Returned" ? "Resubmit for review" : "Submit for review"}
        </Button>
      </Stack>
      {!complete && <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right", mt: 1 }}>Enter all {report.analytes.length} results to submit.</Typography>}

      <Dialog open={confirmDiscard} onClose={() => setConfirmDiscard(false)}>
        <DialogTitle>Discard this run?</DialogTitle>
        <DialogContent><DialogContentText>The run and any values you entered will be deleted.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscard(false)}>Keep it</Button>
          <Button color="error" variant="contained" onClick={discard} disabled={busy === "discard"}>Discard</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function ResultsTable({ report }: { report: Report }) {
  return (
    <Paper sx={{ p: { xs: 2, md: 3 } }} component="section" aria-labelledby="results-title">
      <Typography id="results-title" variant="h2" component="h2" sx={{ mb: 2 }}>Results</Typography>
      <TableContainer>
        <Table size="small" aria-label="Submitted results">
          <TableHead>
            <TableRow>
              <TableCell>Analyte</TableCell>
              <TableCell align="right">Result</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Target (mean ± SD)</TableCell>
              <TableCell align="right">z-score</TableCell>
              <TableCell>Check</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {report.analytes.map((a) => {
              const input = report.analyteInputs.find((i) => i.analyteID === a.analyteID);
              const z = input ? zScore(input.analyteValue, a.mean, a.stdDevi) : NaN;
              const rules = singleValueRules(z);
              return (
                <TableRow key={a.analyteID}>
                  <TableCell><b>{a.analyteAcronym}</b> <Typography component="span" variant="body2" color="text.secondary">{a.analyteName}</Typography></TableCell>
                  <TableCell align="right">{input ? formatValue(input.analyteValue, a.stdDevi) : "—"}</TableCell>
                  <TableCell>{a.unitOfMeasure}</TableCell>
                  <TableCell>{formatValue(a.mean, a.stdDevi)} ± {a.stdDevi}</TableCell>
                  <TableCell align="right">{formatZ(z)}</TableCell>
                  <TableCell>{input ? <QcStatusChip status={statusOf(rules)} rules={rules} /> : "Not entered"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {report.studentComment && (
        <Typography variant="body2" sx={{ mt: 2 }}><b>Student comment:</b> {report.studentComment}</Typography>
      )}
    </Paper>
  );
}

function ReviewPanel({ report, onReviewed }: { report: Report; onReviewed: (r: Report) => void }) {
  const [grade, setGrade] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gradeNum = Number(grade);
  const gradeValid = grade.trim() !== "" && Number.isInteger(gradeNum) && gradeNum >= 0 && gradeNum <= 100;

  async function run(action: () => Promise<Report>) {
    setBusy(true); setError(null);
    try { onReviewed(await action()); }
    catch (err) { setError(err instanceof Error ? err.message : "Review failed."); }
    finally { setBusy(false); }
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 3 }, borderColor: "primary.light" }} component="section" aria-labelledby="review-title" className="no-print">
      <Typography id="review-title" variant="h2" component="h2" sx={{ mb: 0.5 }}>Faculty review</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Check the results and the Levey-Jennings evaluation, then grade the run or return it to the student with instructions.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }} role="alert">{error}</Alert>}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField label="Grade (0–100)" value={grade} onChange={(e) => setGrade(e.target.value)} fullWidth error={grade !== "" && !gradeValid}
            helperText={grade !== "" && !gradeValid ? "Whole number 0–100" : " "} slotProps={{ htmlInput: { inputMode: "numeric" } }} />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <TextField label="Feedback to the student" value={comment} onChange={(e) => setComment(e.target.value)} fullWidth multiline minRows={2}
            helperText="Required when returning a run" slotProps={{ htmlInput: { maxLength: 2000 } }} />
        </Grid>
      </Grid>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="flex-end" sx={{ mt: 1 }}>
        <Button variant="outlined" color="warning" disabled={busy || !comment.trim()} onClick={() => run(() => api.returnRun(report.reportID, comment))}>Return for correction</Button>
        <Button variant="contained" disabled={busy || !gradeValid} onClick={() => run(() => api.gradeRun(report.reportID, gradeNum, comment || undefined))}>Save grade</Button>
      </Stack>
    </Paper>
  );
}

export default function RunPage() {
  const { reportId } = useParams();
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [series, setSeries] = useState<LjSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ljError, setLjError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.getReport(reportId!).then((r) => { if (!cancelled) setReport(r); }).catch((e: Error) => { if (!cancelled) setError(e.message); });
    api.leveyJennings(reportId!).then((s) => { if (!cancelled) { setSeries(s); setLjError(null); } }).catch((e: Error) => { if (!cancelled) setLjError(e.message); });
    return () => { cancelled = true; };
  }, [reportId, version]);

  if (error) return <ErrorState title="Could not load this run" message={error} onRetry={() => setVersion((v) => v + 1)} />;
  if (!report) return <Loading />;

  const isOwner = user?.role === "student" && report.studentID === user.userID;
  const editable = isOwner && (report.status === "InProgress" || report.status === "Returned");
  const update = (r: Report) => { setReport(r); setVersion((v) => v + 1); };

  return (
    <Stack spacing={3}>
      <PageHeader
        title={report.qcName}
        subtitle={
          <>
            Lot {report.lotNumber} · {departmentLabel(report.department)} · Run {formatDateTime(report.runDate)}
            {user?.role === "faculty" && <> · Student: <b>{report.studentName}</b></>}
          </>
        }
        actions={<>
          <ReportStatusChip status={report.status} />
          <Button startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>Print / save PDF</Button>
        </>}
      />

      {report.status === "Returned" && (
        <Alert severity="warning">
          <AlertTitle>Returned for correction</AlertTitle>
          {report.facultyComment}
        </Alert>
      )}
      {report.status === "Submitted" && isOwner && <Alert severity="info">Submitted {formatDateTime(report.submittedDate)}. Your instructor has not reviewed it yet.</Alert>}
      {report.status === "Graded" && (
        <Alert severity="success">
          <AlertTitle>Grade: {report.grade}/100</AlertTitle>
          {report.facultyComment || "No feedback provided."} <Typography component="span" variant="body2" color="text.secondary">· Reviewed {formatDate(report.reviewedDate)}</Typography>
        </Alert>
      )}

      {editable ? <ResultsEntry key={`${report.reportID}-${report.status}`} report={report} onSaved={update} /> : <ResultsTable report={report} />}
      {user?.role === "faculty" && report.status === "Submitted" && <ReviewPanel report={report} onReviewed={update} />}

      <Box component="section" aria-labelledby="lj-title">
        <Typography id="lj-title" variant="h2" component="h2" sx={{ mb: 0.5 }}>Levey-Jennings charts</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {report.studentName ? `${report.studentName}'s` : "Your"} results on this lot in run order, against the lot mean and ±1/2/3 SD.
          Points are colored by Westgard evaluation (blue in control, amber 1-2s warning, red rejection); the larger point is this run.
        </Typography>
        {ljError && <ErrorState message={ljError} />}
        {!series && !ljError && <Loading label="Loading charts…" />}
        {series && (
          <Grid container spacing={2}>
            {series.map((s) => (
              <Grid key={s.analyte.analyteID} size={{ xs: 12, lg: 6 }}>
                <LeveyJenningsChart series={s} currentReportId={report.reportID} />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Stack>
  );
}
