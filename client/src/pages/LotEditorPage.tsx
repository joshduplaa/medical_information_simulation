import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, FormControlLabel, Grid2 as Grid, IconButton, MenuItem, Paper, Stack, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { api, DEPARTMENTS, type AnalyteDraft, type LotDraft, type QcLot } from "../api";
import { ErrorState, Loading } from "../components/PageState";
import { departmentLabel } from "../components/format";
import PageHeader from "./PageHeader";
import { validateLotDraft } from "../lib/lotValidation";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const blankAnalyte = (): AnalyteDraft => ({ analyteName: "", analyteAcronym: "", unitOfMeasure: "", mean: NaN, stdDevi: NaN, minLevel: NaN, maxLevel: NaN });

const EMPTY: LotDraft = {
  lotNumber: "", qcName: "", department: "Chemistry", openDate: today(), expirationDate: plusDays(180), isActive: true,
  analytes: [blankAnalyte()],
};

function fromLot(lot: QcLot): LotDraft {
  return {
    lotNumber: lot.lotNumber, qcName: lot.qcName, department: lot.department, isActive: lot.isActive,
    openDate: lot.openDate.slice(0, 10), expirationDate: lot.expirationDate.slice(0, 10),
    analytes: lot.analytes.map(({ analyteID, analyteName, analyteAcronym, unitOfMeasure, mean, stdDevi, minLevel, maxLevel }) =>
      ({ analyteID, analyteName, analyteAcronym, unitOfMeasure, mean, stdDevi, minLevel, maxLevel })),
  };
}


const num = (v: number) => (Number.isFinite(v) ? String(v) : "");

export default function LotEditorPage() {
  const { lotId } = useParams();
  const isNew = !lotId || lotId === "new";
  const navigate = useNavigate();
  const [draft, setDraft] = useState<LotDraft>(EMPTY);
  const [original, setOriginal] = useState<QcLot | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api.getLot(lotId!)
      .then((lot) => { setOriginal(lot); setDraft(fromLot(lot)); })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [isNew, lotId]);

  const setField = <K extends keyof LotDraft>(key: K, value: LotDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setAnalyte = (i: number, patch: Partial<AnalyteDraft>) =>
    setDraft((d) => ({ ...d, analytes: d.analytes.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const fillRange = (i: number) => {
    const a = draft.analytes[i];
    if (Number.isFinite(a.mean) && Number.isFinite(a.stdDevi)) {
      const r = (v: number) => Math.round(v * 100) / 100;
      setAnalyte(i, { minLevel: r(a.mean - 2 * a.stdDevi), maxLevel: r(a.mean + 2 * a.stdDevi) });
    }
  };
  const lockedIds = new Set(original && original.reportCount > 0 ? original.analytes.map((a) => a.analyteID) : []);

  async function save(e: FormEvent) {
    e.preventDefault();
    const found = validateLotDraft(draft, isNew);
    setProblems(found);
    setSaveError(null);
    if (found.length) return;
    setSaving(true);
    try {
      const payload = { ...draft, openDate: new Date(draft.openDate).toISOString(), expirationDate: new Date(draft.expirationDate).toISOString() };
      if (isNew) await api.createLot(payload);
      else await api.updateLot(lotId!, payload);
      navigate("/lots");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorState message={loadError} />;

  return (
    <Box component="form" onSubmit={save} noValidate>
      <PageHeader
        title={isNew ? "New QC lot" : `Edit ${original?.qcName}`}
        subtitle={isNew ? "Enter the control material, lot details and each analyte's target mean and SD." : `Lot ${original?.lotNumber} · ${original?.reportCount ?? 0} student runs`}
        actions={<>
          <Button onClick={() => navigate("/lots")}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>{saving ? "Saving…" : "Save lot"}</Button>
        </>}
      />
      {(problems.length > 0 || saveError) && (
        <Alert severity="error" sx={{ mb: 2 }} role="alert">
          {saveError ?? <ul style={{ margin: 0, paddingLeft: 18 }}>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        </Alert>
      )}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h2" component="h2" sx={{ mb: 2 }}>Lot details</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="QC material name" value={draft.qcName} onChange={(e) => setField("qcName", e.target.value)} required fullWidth placeholder="e.g. BMP Level I" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField label="Lot number" value={draft.lotNumber} onChange={(e) => setField("lotNumber", e.target.value)} required fullWidth disabled={!isNew}
              helperText={isNew ? "At least 8 characters; must be unique" : "Lot numbers cannot change"} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField select label="Department" value={draft.department} onChange={(e) => setField("department", e.target.value as LotDraft["department"])} fullWidth>
              {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{departmentLabel(d)}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField label="Open date" type="date" value={draft.openDate} onChange={(e) => setField("openDate", e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField label="Expiration date" type="date" value={draft.expirationDate} onChange={(e) => setField("expirationDate", e.target.value)} fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex", alignItems: "center" }}>
            <FormControlLabel control={<Switch checked={draft.isActive} onChange={(e) => setField("isActive", e.target.checked)} />}
              label={draft.isActive ? "Active — students can order this lot" : "Inactive — hidden from students"} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h2" component="h2">Analytes</Typography>
          <Button startIcon={<AddIcon />} onClick={() => setField("analytes", [...draft.analytes, blankAnalyte()])}>Add analyte</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Mean and SD are the lot's established targets; they drive z-scores, Westgard rules and the Levey-Jennings limits.
          Min/max is the acceptable range shown to students (use "±2SD" to fill it from mean and SD).
        </Typography>
        <TableContainer>
          <Table size="small" aria-label="Analytes on this lot">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 180 }}>Name</TableCell>
                <TableCell sx={{ minWidth: 90 }}>Acronym</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Unit</TableCell>
                <TableCell sx={{ minWidth: 95 }}>Mean</TableCell>
                <TableCell sx={{ minWidth: 95 }}>SD</TableCell>
                <TableCell sx={{ minWidth: 95 }}>Min</TableCell>
                <TableCell sx={{ minWidth: 95 }}>Max</TableCell>
                <TableCell><span className="sr-only">Actions</span></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.analytes.map((a, i) => {
                const label = a.analyteName || `analyte ${i + 1}`;
                const numberField = (key: "mean" | "stdDevi" | "minLevel" | "maxLevel", name: string) => (
                  <TextField size="small" type="number" value={num(a[key])} onChange={(e) => setAnalyte(i, { [key]: e.target.value === "" ? NaN : Number(e.target.value) })}
                    slotProps={{ htmlInput: { "aria-label": `${name} for ${label}`, step: "any" } }} />
                );
                return (
                  <TableRow key={a.analyteID ?? `new-${i}`}>
                    <TableCell><TextField size="small" fullWidth value={a.analyteName} onChange={(e) => setAnalyte(i, { analyteName: e.target.value })} slotProps={{ htmlInput: { "aria-label": `Name for analyte ${i + 1}` } }} /></TableCell>
                    <TableCell><TextField size="small" value={a.analyteAcronym} onChange={(e) => setAnalyte(i, { analyteAcronym: e.target.value })} slotProps={{ htmlInput: { "aria-label": `Acronym for ${label}` } }} /></TableCell>
                    <TableCell><TextField size="small" value={a.unitOfMeasure} onChange={(e) => setAnalyte(i, { unitOfMeasure: e.target.value })} slotProps={{ htmlInput: { "aria-label": `Unit for ${label}` } }} /></TableCell>
                    <TableCell>{numberField("mean", "Mean")}</TableCell>
                    <TableCell>{numberField("stdDevi", "SD")}</TableCell>
                    <TableCell>{numberField("minLevel", "Min")}</TableCell>
                    <TableCell>{numberField("maxLevel", "Max")}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      <Button size="small" onClick={() => fillRange(i)} aria-label={`Set min and max for ${label} to mean ± 2 SD`}>±2SD</Button>
                      <Tooltip title={a.analyteID && lockedIds.has(a.analyteID) ? "Students have results for this analyte" : "Remove analyte"}>
                        <span>
                          <IconButton size="small" disabled={!!a.analyteID && lockedIds.has(a.analyteID)} aria-label={`Remove ${label}`}
                            onClick={() => setField("analytes", draft.analytes.filter((_, j) => j !== i))}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
