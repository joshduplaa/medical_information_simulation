import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Grid2 as Grid, Stack, Typography } from "@mui/material";
import { api, type QcLot } from "../api";
import { EmptyState, ErrorState, Loading } from "../components/PageState";
import { useAsync } from "../components/useAsync";
import { departmentLabel, formatDate } from "../components/format";
import PageHeader from "./PageHeader";

export default function OrderQcPage() {
  const navigate = useNavigate();
  const { data: lots, error, loading, reload } = useAsync(() => api.listLots(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  async function order(lot: QcLot) {
    setBusy(lot.adminQCLotID);
    setOrderError(null);
    try {
      const run = await api.orderRun(lot.adminQCLotID);
      navigate(`/runs/${run.reportID}`);
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Could not order QC.");
      setBusy(null);
    }
  }

  const orderable = (lots ?? []).filter((l) => l.isActive && new Date(l.expirationDate) >= new Date(new Date().toISOString().slice(0, 10)));

  return (
    <>
      <PageHeader title="Order QC" subtitle="Choose the control material you are running. Ordering creates a QC run where you will enter your results." />
      {orderError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setOrderError(null)}>{orderError}</Alert>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {lots && orderable.length === 0 && <EmptyState title="No QC lots available" message="Your instructor has not opened any active QC lots yet." />}
      <Grid container spacing={2}>
        {orderable.map((lot) => (
          <Grid key={lot.adminQCLotID} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardContent sx={{ flex: 1 }}>
                <Chip size="small" label={departmentLabel(lot.department)} sx={{ mb: 1 }} />
                <Typography variant="h3" component="h2">{lot.qcName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Lot {lot.lotNumber} · expires {formatDate(lot.expirationDate)}
                </Typography>
                <Stack direction="row" gap={0.5} flexWrap="wrap">
                  {lot.analytes.map((a) => <Chip key={a.analyteID} size="small" variant="outlined" label={a.analyteAcronym} title={a.analyteName} />)}
                </Stack>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={() => order(lot)} disabled={busy !== null} aria-label={`Order ${lot.qcName} lot ${lot.lotNumber}`}>
                  {busy === lot.adminQCLotID ? "Ordering…" : "Order run"}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
