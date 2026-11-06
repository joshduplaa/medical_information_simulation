import { Alert, AlertTitle, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ display: "flex", alignItems: "center", gap: 2, py: 6, justifyContent: "center", color: "text.secondary" }}>
      <CircularProgress size={24} aria-hidden />
      <Typography>{label}</Typography>
    </Box>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <Alert severity="error" sx={{ my: 2 }} action={onRetry && <Button color="inherit" size="small" onClick={onRetry}>Retry</Button>}>
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <Paper sx={{ p: 5, textAlign: "center", color: "text.secondary" }}>
      <InboxOutlinedIcon sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} aria-hidden />
      <Typography variant="h3" component="p" color="text.primary">{title}</Typography>
      {message && <Typography sx={{ mt: 1 }}>{message}</Typography>}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </Paper>
  );
}
