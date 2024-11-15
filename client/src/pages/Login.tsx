import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Backdrop } from "@mui/material";
import { useTheme } from "../context/ThemeContext";
import { useForm, SubmitHandler } from "react-hook-form";
import { CredentialsInput } from './Register';
import { AuthToken, UserType, useAuth } from '../context/AuthContext';
import { getAdminByName, getStudentByName } from '../utils/indexedDB/getData';
import { Icon } from "@iconify/react";

const Login = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { login, checkSession, checkUserType } = useAuth();
  const [loginOptions, setLoginOptions] = useState<"Admin" | "Student" | string>("");
  const [isFeedbackErrorOpen, setFeedbackErrorOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit } = useForm<CredentialsInput>();
  




  const onSubmit: SubmitHandler<CredentialsInput> = async (data) => {
    if (loginOptions === "Admin") {
      // const check = await getAdminByName(data.username);
      const sessionCheck = await checkSession();
      if (sessionCheck) {
        navigate("/admin-home");
      }

      const checkServer = await fetch(`${process.env.REACT_APP_API_URL}/Auth/LoginByUsername`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username: data.username, password: data.password }),
      })

      // const res = await checkServer;
      console.log(checkServer);

      try {
        if (checkServer.status === 200) {
          const token: AuthToken = await checkServer.json();
          localStorage.setItem('token', JSON.stringify(token));
          console.log(localStorage.getItem('token'));
          navigate('/admin-home');
          // if ()
        }else {
          alert("Incorrect Username or Password!");
        }
      } catch(e) {
        console.log("Error in login ", e);
      }

      // if (check && check.password === data.password) {
      //   login(JSON.stringify({ username: data.username, userType: UserType.Admin, initials: check.initials }), check.initials, data.username, UserType.Admin);
      //   navigate('/admin-home');
      // } else {
      //   console.log(new Error("Invalid credentials"));
      // }
      // console.log(username, type);
    } else if (loginOptions === "Student") {
      // const check = await getStudentByName(data.username);
      try {
        const sessionCheck = await checkSession();
        if (sessionCheck) {
          navigate('/student-home');
        }

        const checkServer = await fetch(`${process.env.REACT_APP_API_URL}/Auth/LoginByUsername`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ username: data.username, password: data.password }),
        })

        console.log(checkServer);

        if (checkServer.status === 200) {
          const token: AuthToken = await checkServer.json();

          localStorage.setItem('token', JSON.stringify(token));
          console.log(localStorage.getItem('token'));
          navigate('/student-home');
          // if ()
        }else{
          alert("Incorrect Username or Password!");
        }
      } catch (e) {
        console.log("Error logging in: ", e);
      }

      // console.log(check);
      // if (check && check.password === data.password) {
      //   login(JSON.stringify({ username: data.username, userType: UserType.Student, initials: check.initials }), check.initials, data.username, UserType.Student);
      //   navigate('/student-home');
      // } else {
      //   console.log(new Error("Invalid credentials"));
      // }
    } else {
      setFeedbackErrorOpen(true);
      console.log(new Error("Invalid type"));
    }
  }

  async function checkCurrentSession() {
    const session = await checkSession();

    if (session) {
      if (checkUserType() === UserType.Student) {
        navigate('/student-home');
      } else if (checkUserType() === UserType.Admin) {
        navigate('/admin-home');
      }
    } else {
      navigate('/login');
    }
  }

  useEffect(() => {
    checkCurrentSession();
  }, [])

  useEffect(() => {
    //If notification is enabled, disable after 3 seconds
    if (isFeedbackErrorOpen) {
      setTimeout(() => {
        setFeedbackErrorOpen(false);
      }, 3000);
    }
  }, [isFeedbackErrorOpen])

  return (
    <>
      <div
        className=" flex flex-col w-svw bg-[#2f5597] pb-12"
        style={{ minHeight: "100svh", minWidth: "100svw" }}
      >
        <div
          className="title w-fit mb-0 mx-auto mt-28 bg-[#3a6cc6] px-12"
          style={{ maxWidth: "66.67%" }}
        >
          <div className="title-text font-bold text-ellipsis drop-shadow-xl text-white text-center text-3xl sm:text-6xl py-10">
            Medical Information Simulations
          </div>
        </div>
        <div className="login-form sm:w-1/4 w-3/4 mb-0 mt-24 mx-auto bg-slate-100 flex flex-col gap-4 py-10 px-4 bg-local bg-cover">
          <div className="login-title text-center text-3xl font-semibold">
            Choose Account Type
          </div>
          <div className="user-type flex sm:gap-x-2 box-border">
            <div
              className={`student-img-container flex flex-col sm:gap-y-2 sm:w-1/2 border border-solid border-black sm:px-2 sm:py-4 rounded-md hover:cursor-pointer hover:bg-slate-500/30 transition-all duration-75 ${
                loginOptions === "Student"
                  ? "border-2 !border-[#2f5597]"
                  : ""
              }`}
              onClick={() => {
                setLoginOptions((prevState) =>
                  prevState === "Student" ? "" : "Student"
                );
              }}
            >
              <div className="self-center font-semibold text-xl">Student</div>
            </div>
            <div
              className={`admin-img-container flex flex-col sm:gap-y-2 sm:w-1/2 border border-solid border-black sm:px-2 sm:py-4 rounded-md hover:cursor-pointer hover:bg-slate-500/30 transition-all duration-75 ${
                loginOptions === "Admin"
                  ? "border-2 !border-[#2f5597]"
                  : ""
              }`}
              onClick={() => {
                setLoginOptions((prevState) =>
                  prevState === "Admin" ? "" : "Admin"
                );
              }}
            >
              <div className="self-center font-semibold text-xl">Faculty</div>
            </div>
          </div>
          <form
            action=""
            className="flex flex-col gap-6"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* <TextField variant='outlined' /> */}
            <input
              type="text"
              className="min-h-10 placeholder:font-semibold placeholder:text-center text-center"
              placeholder="Username"
              {...register("username", { required: true })}
            />
            <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full min-h-10  placeholder:font-semibold placeholder:text-center text-center"
                  placeholder="Password"
                  {...register("password", { required: true })}
                />
                <div className="absolute top-1.5 end-11 cursor-pointer">
                  <Icon icon={showPassword? "iconoir:eye-closed" : "iconoir:eye-solid"} className=" absolute top-0 left-13 sm:h-7 sm:w-7 " onClick={() => {setShowPassword(!showPassword)}}/>
                </div>
              </div>
            <Button
              variant="outlined"
              onClick={handleSubmit(onSubmit)}
              className={`!text-black !bg-[${theme.secondaryColor}] !border !border-solid !border-[${theme.primaryBorderColor}] transition ease-in-out hover:!bg-[${theme.primaryHoverColor}] hover:!border-[#2F528F]`}
            >
              Login
            </Button>
          </form>
          <div className="register-link">
            <Link to="/register">
              <div className="register-link-text text-center text-blue-400 ">
                Don't have an account?
              </div>
            </Link>
          </div>
        </div>
      </div>
      <Backdrop
        open={isFeedbackErrorOpen}
        
        onClick={() => {
          setFeedbackErrorOpen(false);
        }}
      >
        <div className="bg-white rounded-xl">
          <div className="sm:p-8 flex flex-col sm:gap-4">
            <div className="text-center text-gray-600 text-xl font-semibold">
                  <div className="flex flex-col sm:gap-y-2">
                    <Icon icon="material-symbols:cancel-outline" className="text-red-500 sm:text-xl sm:w-20 sm:h-20 sm:self-center"/>
                    <div>Please Select Account Type</div>
                  </div>
              {/* {isFeedbackNotiOpen ? (
                <>
                  <div className="flex flex-col sm:gap-y-2">
                    <Icon icon="clarity:success-standard-line" className="text-green-500 sm:text-xl sm:w-20 sm:h-20 sm:self-center"/>
                    <div>Registration Successful</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:gap-y-2">
                    <Icon icon="material-symbols:cancel-outline" className="text-red-500 sm:text-xl sm:w-20 sm:h-20 sm:self-center"/>
                    <div>Error Occurred</div>
                  </div>
                </>
              ) } */}
            </div>
            <div className="flex justify-center">
              <Button
                variant="contained"
                onClick={() => {
                  setFeedbackErrorOpen(false);
                }}
                className={`!text-white !bg-[${theme.primaryColor}] transition ease-in-out hover:!bg-[${theme.primaryHoverColor}] hover:!text-white`}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </Backdrop>
    </>
  )
}

export default Login