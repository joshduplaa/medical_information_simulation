import { createTheme } from "@mui/material/styles";

// Colors taken from the MIS logo (blue wordmark, green molecule).
export const theme = createTheme({
  palette: {
    primary: { main: "#0F6FA8", dark: "#0B5583", light: "#4B97C6", contrastText: "#fff" },
    secondary: { main: "#267A3F", contrastText: "#fff" }, // logo green, darkened to 5.3:1 on white
    // Status colors darkened from MUI's defaults so chip text meets WCAG AA (4.5:1) on white and as white-on-color.
    info: { main: "#01579B", contrastText: "#fff" },
    warning: { main: "#B45309", contrastText: "#fff" },
    success: { main: "#2E7D32", contrastText: "#fff" },
    error: { main: "#C62828", contrastText: "#fff" },
    background: { default: "#F4F7FA", paper: "#FFFFFF" },
    text: { primary: "#1B2733", secondary: "#4A5A6A" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700 },
    h2: { fontSize: "1.35rem", fontWeight: 700 },
    h3: { fontSize: "1.1rem", fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { border: "1px solid #DFE6EE" } } },
    MuiAppBar: { styleOverrides: { root: { border: "none" } } },
    MuiDrawer: { styleOverrides: { paper: { border: "none" } } },
    // Positioned so absolutely-positioned children (e.g. .sr-only header text) stay inside the horizontal scroll
    // area instead of widening the whole page on phones.
    MuiTableContainer: { styleOverrides: { root: { position: "relative" } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: "#4A5A6A", whiteSpace: "nowrap" } } },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
