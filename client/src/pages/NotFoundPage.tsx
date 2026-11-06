import { Link as RouterLink } from "react-router-dom";
import { Button } from "@mui/material";
import { EmptyState } from "../components/PageState";

export default function NotFoundPage() {
  return <EmptyState title="Page not found" message="That page does not exist." action={<Button variant="contained" component={RouterLink} to="/">Go to dashboard</Button>} />;
}
