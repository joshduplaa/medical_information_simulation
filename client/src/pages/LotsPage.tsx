import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { api, type QcLot } from "../api";
import { EmptyState, ErrorState, Loading } from "../components/PageState";
import { useAsync } from "../components/useAsync";
import { departmentLabel, formatCalendarDate } from "../components/format";
import PageHeader from "./PageHeader";

export default function LotsPage() {
  const { data: lots, error, loading, reload } = useAsync(() => api.listLots(), []);
  const [toDelete, setToDelete] = useState<QcLot | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await api.deleteLot(toDelete.adminQCLotID);
      setToDelete(null);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed.");
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader
        title="QC lots"
        subtitle="Control material lots and their target values. Opening a new active lot with the same name closes the previous one."
        actions={<Button variant="contained" component={RouterLink} to="/lots/new">New QC lot</Button>}
      />
      {actionError && <Alert severity="error" onClose={() => setActionError(null)} sx={{ mb: 2 }}>{actionError}</Alert>}
      {loading && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {lots && lots.length === 0 && (
        <EmptyState title="No QC lots yet" message="Create a lot with its analytes so students can order QC." action={<Button variant="contained" component={RouterLink} to="/lots/new">New QC lot</Button>} />
      )}
      {lots && lots.length > 0 && (
        <TableContainer component={Paper}>
          <Table aria-label="QC lots">
            <TableHead>
              <TableRow>
                <TableCell>QC material</TableCell>
                <TableCell>Lot number</TableCell>
                <TableCell>Department</TableCell>
                <TableCell align="right">Analytes</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Runs</TableCell>
                <TableCell align="right"><span className="sr-only">Actions</span></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lots.map((lot) => {
                const expired = new Date(lot.expirationDate) < new Date();
                return (
                  <TableRow key={lot.adminQCLotID} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{lot.qcName}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace" }}>{lot.lotNumber}</TableCell>
                    <TableCell>{departmentLabel(lot.department)}</TableCell>
                    <TableCell align="right">{lot.analytes.length}</TableCell>
                    <TableCell>{formatCalendarDate(lot.expirationDate)}</TableCell>
                    <TableCell>
                      {lot.isActive && !expired ? <Chip size="small" color="success" label="Active" />
                        : expired ? <Chip size="small" color="warning" label="Expired" variant="outlined" />
                        : <Chip size="small" label="Closed" variant="outlined" />}
                    </TableCell>
                    <TableCell align="right">{lot.reportCount}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Tooltip title="Edit lot">
                        <IconButton component={RouterLink} to={`/lots/${lot.adminQCLotID}`} aria-label={`Edit ${lot.qcName} lot ${lot.lotNumber}`}><EditOutlinedIcon /></IconButton>
                      </Tooltip>
                      <Tooltip title={lot.reportCount > 0 ? "Lots with student runs cannot be deleted — deactivate instead" : "Delete lot"}>
                        <span>
                          <IconButton disabled={lot.reportCount > 0} onClick={() => setToDelete(lot)} aria-label={`Delete ${lot.qcName} lot ${lot.lotNumber}`}><DeleteOutlineIcon /></IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={!!toDelete} onClose={() => setToDelete(null)}>
        <DialogTitle>Delete QC lot?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toDelete?.qcName} (lot {toDelete?.lotNumber}) and its analyte definitions will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
