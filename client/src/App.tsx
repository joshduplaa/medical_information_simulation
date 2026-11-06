import { BrowserRouter, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AuthProvider } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import AppLayout from "./components/AppLayout";
import { theme } from "./theme";
import AccountPage from "./pages/AccountPage";
import DashboardPage from "./pages/DashboardPage";
import GradebookPage from "./pages/GradebookPage";
import LoginPage from "./pages/LoginPage";
import LotEditorPage from "./pages/LotEditorPage";
import LotsPage from "./pages/LotsPage";
import NotFoundPage from "./pages/NotFoundPage";
import OrderQcPage from "./pages/OrderQcPage";
import RegisterPage from "./pages/RegisterPage";
import ReviewQueuePage from "./pages/ReviewQueuePage";
import RunPage from "./pages/RunPage";
import RunsPage from "./pages/RunsPage";

/**
 * Every route here is backed by persisted data (API or demo store). The original template pages for quizzes,
 * case studies, patient reports and reference files had no backend and were removed — see docs/HANDOFF.md.
 */
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<RequireRole><AppLayout /></RequireRole>}>
              <Route index element={<DashboardPage />} />
              <Route path="runs" element={<RunsPage />} />
              <Route path="runs/:reportId" element={<RunPage />} />
              <Route path="gradebook" element={<GradebookPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="order" element={<RequireRole role="student"><OrderQcPage /></RequireRole>} />
              <Route path="lots" element={<RequireRole role="faculty"><LotsPage /></RequireRole>} />
              <Route path="lots/:lotId" element={<RequireRole role="faculty"><LotEditorPage /></RequireRole>} />
              <Route path="review" element={<RequireRole role="faculty"><ReviewQueuePage /></RequireRole>} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
