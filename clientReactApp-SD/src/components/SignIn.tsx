import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import ForgotPassword from "./ForgotPassword.tsx";
import AppTheme from "../shared-theme/AppTheme.tsx";
import ColorModeSelect from "../shared-theme/ColorModeSelect.tsx";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { deleteData } from "../util/indexedDB/deleteData.ts";

import addData from "../util/indexedDB/addData.ts";
import { Admin } from "../util/indexedDB/IDBSchema.ts";
import { Student } from "../util/indexedDB/IDBSchema.ts";
//for hashed password verification
import { verifyPassword } from "./PasswordEncryption.jsx";


const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: "10px",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'fixed',
    zIndex: -1,
    inset: 0,
    backgroundColor: theme.palette.mode === 'dark' ? '#457A64' : '#607D8B', // Darker steel blue for dark mode, lighter steel blue for light mode
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

export default function SignIn(props: { disableCustomTheme?: boolean }) {
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const validateInputs = () => {
    let isValid = true;

    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email address.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters long.");
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;
  
    try {
      const [studentsResponse, adminsResponse] = await Promise.all([
        axios.get("http://localhost:5029/api/students"),
        axios.get("http://localhost:5029/api/admins"),
      ]);
  
      const students = studentsResponse.data;
      const admins = adminsResponse.data;
  
      console.log("student local data: ", students);
      console.log("admin local data: ", admins);
  
      const studentFound = students.find(
        (studentFound: any) =>
          studentFound.email === email && verifyPassword(password, studentFound.password)//studentFound.password === password,
      );
  
      const adminFound = admins.find(
        (adminFound: any) =>
          adminFound.email === email && verifyPassword(password, adminFound.password)//adminFound.password === password,
      );

  
      if (studentFound) {
        const loginStart = new Date().toISOString();
        console.log("studentFound: ", studentFound);
  
        const studentLocalData = {
          id: studentFound.studentID as string,
          email: studentFound.email as string,
          username: studentFound.username as string,
          password: studentFound.password as string,
          firstname: studentFound.firstname as string,
          lastname: studentFound.lastname as string,
          initials: studentFound.initials as string,
          loginTime: loginStart as string,
          type: "student",
        };
  
        // Delete existing student entry if it exists
        await deleteData("students", studentLocalData.id);
  
        // Add the new student data
        await addData("students", studentLocalData);
        navigate("/home");
      } else if (adminFound) {
        const loginStart = new Date().toISOString();
        console.log("adminFound: ", adminFound);
  
        const adminLocalData = {
          id: adminFound.adminID as string,
          email: adminFound.email as string,
          username: adminFound.username as string,
          password: adminFound.password as string,
          firstname: adminFound.firstname as string,
          lastname: adminFound.lastname as string,
          initials: adminFound.initials as string,
          loginTime: loginStart as string,
          type: "admin", 
        };
  
        // Delete existing admin entry if it exists
        await deleteData("admins", adminLocalData.id);
  
        // Add the new admin data
        await addData("admins", adminLocalData);
        navigate("/home");


      } else {
        setLoginError(true);
      }
    } catch (err) {
      console.error("Error during login:", err);
      setLoginError(true);
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect
          sx={{ position: "fixed", top: "1rem", right: "1rem" }}
        />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
          >
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}
          >
            <FormControl>
              <FormLabel htmlFor="email">TTU HSC Email</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="your@hsc.ttu.edu"
                autoComplete="email"
                autoFocus
                required
                fullWidth
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <FormLabel htmlFor="password">Password</FormLabel>
                <Link
                  component="button"
                  type="button"
                  onClick={handleClickOpen}
                  variant="body2"
                >
                  Forgot your password?
                </Link>
              </Box>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                required
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="Remember me"
            />
            <ForgotPassword open={open} handleClose={handleClose} />
            <Button type="submit" fullWidth variant="contained">
              Sign in
            </Button>
            <Typography sx={{ textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <Link href="/register" variant="body2">
                Sign up
              </Link>
            </Typography>
          </Box>
        </Card>
        <Snackbar
          open={loginError}
          autoHideDuration={6000}
          onClose={() => setLoginError(false)}
        >
          <MuiAlert
            onClose={() => setLoginError(false)}
            severity="error"
            sx={{ width: "100%" }}
          >
            Invalid email or password. Please try again.
          </MuiAlert>
        </Snackbar>
      </SignInContainer>
    </AppTheme>
  );
}
