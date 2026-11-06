import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AppBar, Alert, Avatar, Box, Chip, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Menu, MenuItem, Toolbar, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import PlaylistAddOutlinedIcon from "@mui/icons-material/PlaylistAddOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import GradingOutlinedIcon from "@mui/icons-material/GradingOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useAuth } from "../auth/AuthContext";
import { config } from "../config";
import logo from "../assets/CleanedUpHorizontalLogo.png";

const DRAWER_WIDTH = 248;

interface NavItem { to: string; label: string; icon: ReactNode }

const STUDENT_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <DashboardOutlinedIcon /> },
  { to: "/order", label: "Order QC", icon: <PlaylistAddOutlinedIcon /> },
  { to: "/runs", label: "My QC runs", icon: <AssignmentOutlinedIcon /> },
  { to: "/gradebook", label: "Gradebook", icon: <GradingOutlinedIcon /> },
];

const FACULTY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <DashboardOutlinedIcon /> },
  { to: "/lots", label: "QC lots", icon: <ScienceOutlinedIcon /> },
  { to: "/review", label: "Review queue", icon: <RateReviewOutlinedIcon /> },
  { to: "/runs", label: "All QC runs", icon: <AssignmentOutlinedIcon /> },
  { to: "/gradebook", label: "Gradebook", icon: <GradingOutlinedIcon /> },
];

export function DemoBanner() {
  if (!config.demoMode) return null;
  return (
    <Alert severity="info" icon={false} role="note" sx={{ borderRadius: 0, justifyContent: "center", py: 0, "& .MuiAlert-message": { py: 0.75 } }} className="no-print">
      Demo mode — runs entirely in your browser with synthetic data. Nothing is sent to a server.
    </Alert>
  );
}

export function Disclaimer() {
  return (
    <Typography component="footer" variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center", py: 3, px: 2 }}>
      Medical Information Simulation (MIS) is an educational simulation for clinical laboratory students. Not for clinical use.
      All people and results shown are synthetic.
    </Typography>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const nav = user?.role === "faculty" ? FACULTY_NAV : STUDENT_NAV;

  const drawer = (
    <Box component="nav" aria-label="Main" sx={{ pt: 1 }}>
      <List>
        {nav.map((item) => (
          <ListItem key={item.to} disablePadding>
          <ListItemButton
            component={NavLink}
            to={item.to}
            end={item.to === "/"}
            onClick={() => setMobileOpen(false)}
            sx={{
              mx: 1, borderRadius: 2, mb: 0.5, flexGrow: 1,
              "&.active": { bgcolor: "primary.main", color: "primary.contrastText", "& .MuiListItemIcon-root": { color: "inherit" } },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <a href="#main" className="skip-link">Skip to content</a>
      <DemoBanner />
      <AppBar position="sticky" color="inherit" sx={{ borderBottom: "1px solid #DFE6EE" }} className="no-print">
        <Toolbar sx={{ gap: 1 }}>
          {!desktop && (
            <IconButton edge="start" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          )}
          <Box component={NavLink} to="/" sx={{ display: "flex", alignItems: "center" }} aria-label="MIS home">
            <Box component="img" src={logo} alt="MIS — Medical Information Simulation" sx={{ height: 36 }} />
          </Box>
          <Box sx={{ flex: 1 }} />
          {user && (
            <>
              <Chip size="small" label={user.role === "faculty" ? "Faculty" : "Student"} color={user.role === "faculty" ? "secondary" : "primary"} variant="outlined" sx={{ display: { xs: "none", sm: "flex" } }} />
              <IconButton aria-label="Account menu" aria-haspopup="menu" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14 }}>{user.initials}</Avatar>
              </IconButton>
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem disabled sx={{ opacity: "1 !important" }}>
                  <Box>
                    <Typography fontWeight={600}>{user.firstname} {user.lastname}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { setMenuAnchor(null); navigate("/account"); }}>
                  <ListItemIcon><PersonOutlineIcon fontSize="small" /></ListItemIcon>Account
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); signOut(); navigate("/login"); }}>Sign out</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1 }}>
        {desktop ? (
          <Drawer variant="permanent" className="no-print" sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH, position: "relative", bgcolor: "transparent" } }}>
            {drawer}
          </Drawer>
        ) : (
          <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}>
            <Toolbar><Box component="img" src={logo} alt="" sx={{ height: 32 }} /></Toolbar>
            {drawer}
          </Drawer>
        )}
        <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 4 }, maxWidth: 1200, outline: "none" }}>
          <Outlet />
          <Disclaimer />
        </Box>
      </Box>
    </Box>
  );
}
