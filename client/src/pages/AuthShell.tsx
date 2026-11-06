import { Box, Paper, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { DemoBanner, Disclaimer } from "../components/AppLayout";
import logo from "../assets/CleanedUpHorizontalLogo.png";

export default function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <DemoBanner />
      <Box component="main" sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Paper sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 } }}>
          <Box component="img" src={logo} alt="MIS — Medical Information Simulation" sx={{ height: 56, display: "block", mx: "auto", mb: 2 }} />
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
            Laboratory information system simulation for clinical lab science students
          </Typography>
          <Typography variant="h1" component="h1" sx={{ mb: 2 }}>{title}</Typography>
          {children}
        </Paper>
      </Box>
      <Disclaimer />
    </Box>
  );
}
