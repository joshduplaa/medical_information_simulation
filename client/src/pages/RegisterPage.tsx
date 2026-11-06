import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Link, Typography } from "@mui/material";
import { api } from "../api";
import AccountForm from "../components/AccountForm";
import AuthShell from "./AuthShell";

export default function RegisterPage() {
  const navigate = useNavigate();
  return (
    <AuthShell title="Create a student account">
      <AccountForm
        idPrefix="register"
        submitLabel="Create account"
        busyLabel="Creating account…"
        onSubmit={async (draft) => {
          await api.register(draft);
          navigate("/login", { state: { registered: true } });
        }}
        footer={<>
          <Typography variant="body2" textAlign="center">
            Already registered? <Link component={RouterLink} to="/login">Sign in</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Faculty accounts are created by existing faculty. Use synthetic details only — this is a training system.
          </Typography>
        </>}
      />
    </AuthShell>
  );
}
