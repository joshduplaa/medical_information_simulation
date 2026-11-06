import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Grid2 as Grid, Link, Stack, TextField, Typography } from "@mui/material";
import { api, type RegisterDraft } from "../api";
import AuthShell from "./AuthShell";
import { passwordProblem } from "../lib/password";

const EMPTY: RegisterDraft = { username: "", email: "", password: "", firstname: "", lastname: "", initials: "" };


export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = (key: keyof RegisterDraft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if ((key === "firstname" || key === "lastname") && (!f.initials || f.initials === (f.firstname[0] ?? "") + (f.lastname[0] ?? ""))) {
        next.initials = ((next.firstname[0] ?? "") + (next.lastname[0] ?? "")).toUpperCase();
      }
      return next;
    });
  };

  const pwProblem = passwordProblem(form.password);
  const mismatch = confirm.length > 0 && confirm !== form.password;
  const emailBad = form.email.length > 0 && !/^\S+@\S+\.\S+$/.test(form.email);
  const complete = Object.values(form).every((v) => v.trim()) && !pwProblem && !mismatch && !emailBad && confirm === form.password;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!complete) return;
    setBusy(true);
    setError(null);
    try {
      await api.register({ ...form, username: form.username.trim(), email: form.email.trim() });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create a student account">
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={2}>
          {error && <Alert severity="error" role="alert">{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5 }}><TextField label="First name" value={form.firstname} onChange={set("firstname")} required fullWidth autoComplete="given-name" /></Grid>
            <Grid size={{ xs: 8, sm: 5 }}><TextField label="Last name" value={form.lastname} onChange={set("lastname")} required fullWidth autoComplete="family-name" /></Grid>
            <Grid size={{ xs: 4, sm: 2 }}><TextField label="Initials" value={form.initials} onChange={set("initials")} required fullWidth slotProps={{ htmlInput: { maxLength: 5 } }} /></Grid>
          </Grid>
          <TextField label="Username" value={form.username} onChange={set("username")} required fullWidth autoComplete="username" helperText="Letters, digits, '.', '_' or '-'" />
          <TextField label="Email" type="email" value={form.email} onChange={set("email")} required fullWidth autoComplete="email" error={emailBad} helperText={emailBad ? "Enter a valid email address." : " "} />
          <TextField label="Password" type="password" value={form.password} onChange={set("password")} required fullWidth autoComplete="new-password"
            error={touched && !!pwProblem} helperText={form.password ? pwProblem ?? "Looks good." : "8+ characters with upper, lower and a digit."} />
          <TextField label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required fullWidth autoComplete="new-password"
            error={mismatch} helperText={mismatch ? "Passwords do not match." : " "} />
          <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
          <Typography variant="body2" textAlign="center">
            Already registered? <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Faculty accounts are created by existing faculty. Use synthetic details only — this is a training system.
          </Typography>
        </Stack>
      </Box>
    </AuthShell>
  );
}
