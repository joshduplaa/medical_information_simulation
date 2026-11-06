import { useState, type FormEvent } from "react";
import { Link as RouterLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { config } from "../config";
import AuthShell from "./AuthShell";

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = (location.state as { registered?: boolean } | null)?.registered;
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const fill = (u: string, p: string) => { setUsername(u); setPassword(p); };

  return (
    <AuthShell title="Sign in">
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={2}>
          {notice && <Alert severity="success">Account created. Sign in with your new username.</Alert>}
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <TextField label="Username or email" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required autoFocus fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required fullWidth />
          <Button type="submit" variant="contained" size="large" disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Typography variant="body2" textAlign="center">
            New student? <Link component={RouterLink} to="/register">Create an account</Link>
          </Typography>
        </Stack>
      </Box>
      {config.showDemoCredentials && (
        <Alert severity="info" sx={{ mt: 3 }} icon={false} role="note">
          <Typography variant="body2" fontWeight={600} gutterBottom>Synthetic demo accounts</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" onClick={() => fill("faculty", "Faculty123!")}>Faculty: faculty / Faculty123!</Button>
            <Button size="small" variant="outlined" onClick={() => fill("student", "Student123!")}>Student: student / Student123!</Button>
          </Stack>
        </Alert>
      )}
    </AuthShell>
  );
}
