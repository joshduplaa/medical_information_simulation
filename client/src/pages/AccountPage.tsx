import { useState } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { api, resetDemoData } from "../api";
import { useAuth } from "../auth/AuthContext";
import AccountForm from "../components/AccountForm";
import { config } from "../config";
import PageHeader from "./PageHeader";

/** Faculty create other faculty accounts here; public sign-up only ever creates students. */
function AddFacultyPanel() {
  const [created, setCreated] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  return (
    <Paper sx={{ p: 3, maxWidth: 560, mt: 3 }} component="section" aria-labelledby="add-faculty-title">
      <Typography id="add-faculty-title" variant="h2" component="h2" gutterBottom>Add a faculty member</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Creates an account with faculty access (manage QC lots, review and grade runs). Students register themselves.
      </Typography>
      {created && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setCreated(null)}>Faculty account “{created}” created. They can sign in now.</Alert>}
      <AccountForm
        key={formKey}
        idPrefix="faculty"
        submitLabel="Create faculty account"
        busyLabel="Creating…"
        onSubmit={async (draft) => {
          await api.registerFaculty(draft);
          setCreated(draft.username);
          setFormKey((k) => k + 1); // clear the form for the next one
        }}
      />
    </Paper>
  );
}

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [reset, setReset] = useState(false);
  if (!user) return null;
  return (
    <>
      <PageHeader title="Account" />
      <Paper sx={{ p: 3, maxWidth: 560 }}>
        <Stack spacing={1}>
          <Typography><b>Name:</b> {user.firstname} {user.lastname} ({user.initials})</Typography>
          <Typography><b>Username:</b> {user.username}</Typography>
          <Typography><b>Email:</b> {user.email}</Typography>
          <Typography><b>Role:</b> {user.role === "faculty" ? "Faculty" : "Student"}</Typography>
        </Stack>
      </Paper>
      {user.role === "faculty" && <AddFacultyPanel />}
      {config.demoMode && resetDemoData && (
        <Paper sx={{ p: 3, maxWidth: 560, mt: 3 }}>
          <Typography variant="h2" component="h2" gutterBottom>Demo data</Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>Everything you changed lives only in this browser. Reset it to the original synthetic dataset.</Typography>
          {reset ? <Alert severity="success">Demo data reset. Sign in again to continue.</Alert> : (
            <Button variant="outlined" color="warning" onClick={() => { resetDemoData?.(); setReset(true); setTimeout(signOut, 800); }}>Reset demo data</Button>
          )}
        </Paper>
      )}
    </>
  );
}
