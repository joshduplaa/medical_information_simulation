import { useState, type FormEvent, type ReactNode } from "react";
import { Alert, Box, Button, Grid2 as Grid, Stack, TextField } from "@mui/material";
import type { RegisterDraft } from "../api";
import { passwordProblem } from "../lib/password";

const EMPTY: RegisterDraft = { username: "", email: "", password: "", firstname: "", lastname: "", initials: "" };

interface Props {
  /** Creates the account; throw to show the error message. */
  onSubmit: (draft: RegisterDraft) => Promise<void>;
  submitLabel: string;
  busyLabel: string;
  /** Rendered under the submit button. */
  footer?: ReactNode;
  /** Prefix for field ids, so two forms on one page never collide. */
  idPrefix?: string;
}

/** Name, username, email and password with client-side checks that mirror the API's validation. */
export default function AccountForm({ onSubmit, submitLabel, busyLabel, footer, idPrefix = "account" }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const set = (key: keyof RegisterDraft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Keep initials in sync with the names until the user edits them by hand.
      if ((key === "firstname" || key === "lastname") && (!f.initials || f.initials === ((f.firstname[0] ?? "") + (f.lastname[0] ?? "")).toUpperCase())) {
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
    if (!complete) {
      setError("Fill in every field; the password must meet the rules and match its confirmation.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...form, username: form.username.trim(), email: form.email.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={2}>
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}><TextField id={id("first")} label="First name" value={form.firstname} onChange={set("firstname")} required fullWidth autoComplete="given-name" /></Grid>
          <Grid size={{ xs: 8, sm: 5 }}><TextField id={id("last")} label="Last name" value={form.lastname} onChange={set("lastname")} required fullWidth autoComplete="family-name" /></Grid>
          <Grid size={{ xs: 4, sm: 2 }}><TextField id={id("initials")} label="Initials" value={form.initials} onChange={set("initials")} required fullWidth slotProps={{ htmlInput: { maxLength: 5 } }} /></Grid>
        </Grid>
        <TextField id={id("username")} label="Username" value={form.username} onChange={set("username")} required fullWidth autoComplete="username" helperText="Letters, digits, '.', '_' or '-'" />
        <TextField id={id("email")} label="Email" type="email" value={form.email} onChange={set("email")} required fullWidth autoComplete="email" error={emailBad} helperText={emailBad ? "Enter a valid email address." : " "} />
        <TextField id={id("password")} label="Password" type="password" value={form.password} onChange={set("password")} required fullWidth autoComplete="new-password"
          error={touched && !!pwProblem} helperText={form.password ? pwProblem ?? "Looks good." : "8+ characters with upper, lower and a digit."} />
        <TextField id={id("confirm")} label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required fullWidth autoComplete="new-password"
          error={mismatch} helperText={mismatch ? "Passwords do not match." : " "} />
        <Button type="submit" variant="contained" size="large" disabled={busy}>{busy ? busyLabel : submitLabel}</Button>
        {footer}
      </Stack>
    </Box>
  );
}
