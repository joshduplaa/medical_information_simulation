import { useState } from "react";
import { Alert, Button, Paper, Stack, Typography } from "@mui/material";
import { resetDemoData } from "../api";
import { useAuth } from "../auth/AuthContext";
import { config } from "../config";
import PageHeader from "./PageHeader";

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
