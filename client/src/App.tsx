import React, { useMemo } from "react";
import { Routes, Route, Navigate, Link, useNavigate, createBrowserRouter, RouterProvider, useParams } from "react-router-dom";
import initIDB from "./utils/indexedDB/initIDB";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentHomeScreen from "./pages/StudentView/StudentHomeScreen";
import StudentQualityControls from "./pages/StudentView/StudentQualityControls";
import ChemistryOrderControls from "./pages/General/Chemistry/ChemistryOrderControls";
import ChemistryQCResult from "./pages/General/Chemistry/ChemistryQCResult";
import ChemistryAnalyteInputPage from "./pages/General/Chemistry/ChemistryAnalyteInputPage";
import Unauthorized from "./pages/Unauthorized";
import { AuthProvider, useAuth } from "./context/AuthContext";
import FacultyHomeScreen from "./pages/FacultyView/FacultyHomeScreen";
import FacultyQualityControls from "./pages/FacultyView/FacultyQualityControls";
import ChemistryQCBuilder from "./pages/General/Chemistry/ChesmistryQCBuilderPage";
// import { qcTypeLinkList, testTypeLinkList } from "./utils/utils";
import ChemistryEditQC from "./pages/General/Chemistry/ChemistryEditQCPage";
import { ChemistryTestInputPage } from "./pages/General/Chemistry/ChemistryTestInputPage";
import ErrorPage from "./pages/ErrorPage";
import StudentResultsInProgress from "./pages/StudentView/StudentResultsInProgress";
import ChemistryCustomQCBuild from "./pages/General/Chemistry/ChemistryCustomQCBuild";
import ChemistryCustomTests from "./pages/General/Chemistry/ChemistryCustomTests";
import Student_QC_Review from "./pages/StudentView/StudentReviewControls";
import Faculty_QC_Review from "./pages/FacultyView/FacultyReviewControls";
import ChemistryQCTypeButtonsPage from "./pages/General/Chemistry/ChemistryQCTypeSelection";
import Layout from "./utils/Layout";
import ChemistryLeveyJennings from "./pages/General/Chemistry/ChemistryLeveyJennings";
import SimpleAnalyteInputPage from "./pages/General/Chemistry/SimpleAnalyteInputPage";
import Simple_Faculty_QC_Review  from "./pages/FacultyView/Simple_Faculty_Review_Controls";
import { getAllDataFromStore } from "./utils/indexedDB/getData";
// import UAQCbuilder from "./pages/General/Chemistry/UrinalysisBodyFluidQCBuilderPage";
// import UrinalysisDisplay from "./pages/General/Chemistry/urinalysi";

//UA
import UABFLeveyAnalyteInputPage from "./pages/General/Urinalysis/UABFLeveyAnalyteInputPage";
import UrinalysisCustomQCBuild from "./pages/General/Urinalysis/UrinalysisCustomQCBuild";
import UrinalysisCustomTests from "./pages/General/Urinalysis/UrinalysisCustomTests";
import UrinalysisEditQC from "./pages/General/Urinalysis/UrinalysisEditQCPage";
import UrinalysisLeveyJennings from "./pages/General/Urinalysis/UrinalysisLeveyJennings";
import UABFOrderControls from "./pages/General/Urinalysis/UABFOrderControls";
import UrinalysisQCBuilder from "./pages/General/Urinalysis/UrinalysisQCBuilderPage";
import UrinalysisQCResult from "./pages/General/Urinalysis/UABFQCResult";
import UrinalysisQCTypeSelection from "./pages/General/Urinalysis/UrinalysisQCTypeSelection";
import UrinalysisQCTypeButtonsPage from "./pages/General/Urinalysis/UrinalysisQCTypeSelection";
import {UrinalysisTestInputPage} from "./pages/General/Urinalysis/UrinalysisTestInputPage";
import {UrinalysisQualitativeInput} from "./pages/General/Urinalysis/UrinalysisQualitativeInput";
import UrinalysisPageSwitcher from "./pages/General/Urinalysis/UrinalysisPageSwitcher";

//BF
import {BFQualitativeInput} from "./pages/General/Urinalysis/BFQualitativeInput";
import BFQCTypeButtonsPage from "./pages/General/Urinalysis/BFQCTypeSelection";
import BFCustomQCBuild from "./pages/General/Urinalysis/BFCustomQCBuild";
import BFCustomTests from "./pages/General/Urinalysis/BFCustomTests";
import { BFTestInputPage } from "./pages/General/Urinalysis/BFTestInputPage";
import BFEditQC from "./pages/General/Urinalysis/BFEditQCPage";
import BFQCBuilder from "./pages/General/Urinalysis/BFQCBuilderPage";
import BFAnalyteInputPage from "./pages/General/Urinalysis/BFAnalyteInputPage";
import QualitativeAnalyte from './components/QualitativeAnalyte';
import QualitativeAnalyteInputPage from './pages/General/Urinalysis/UABFQualitativeAnalyteInputPage';


function App() {
  initIDB();
  return (
    // <AuthProvider>
    // </AuthProvider>
    <AppWithRouter />
  );
}

function AppWithRouter() {
  // const { checkSession, checkUserType } = useAuth();

  const router = useMemo(() => {
    return createBrowserRouter([
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/login" /> },
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          {
            path: 'student-home',
            element: <StudentHomeScreen />,
          },
          {
            path: 'admin-home',
            element: <FacultyHomeScreen />,
          },
          {
            path: 'student-qc',
            element: <StudentQualityControls />,
          },
          {
            path: 'admin-qc',
            element: <FacultyQualityControls />,
          },
          {
            path: 'student-review_controls',
            element: <Student_QC_Review />,
          },
          {
            path: 'admin-review_controls',
            element: <Simple_Faculty_QC_Review />,
          },
          
          { path: 'student-results', element: <StudentResultsInProgress /> },
          
          // CHEMISTRY PATHS
          { 
            path: 'chemistry', 
            children: [
              

              {
                path: 'qc_results',
                element: <ChemistryQCResult link="chemistry" name="Chemistry" />,
              },
             
              {
                path: 'simple-analyte-input-page',
                element: <SimpleAnalyteInputPage name="Chemistry" />,  
              },
              {
                path: "qc_results/:link",
                element: <ChemistryAnalyteInputPage name="" />,
                loader: async ({ params }) => {
                  const { link } = params;
                  console.log("loader function: ", link);

                  return null;
                }
              },
              { 
                path: 'order_controls', 
                element: <ChemistryOrderControls /> 
              },
              {
                path: "qc_builder",
                element: <ChemistryQCBuilder />,
              },
              {
                path: 'levey-jennings/:fileName/:lotNumber/:analyteName',
                element: <ChemistryLeveyJennings />,
              },
              {
                path: "edit_qc",
                element: <ChemistryEditQC />,
              },
              {
                path: "edit_qc/:item",
                element: <ChemistryTestInputPage name="CMP Level I" />,
              },
              {
                path: "build_qc/:item",
                element: <ChemistryCustomQCBuild name="Chemistry" />,
              },
              {
                path: "custom_tests",
                element: <ChemistryCustomTests />,
              },
              {
                path: "qc_types",
                element: <ChemistryQCTypeButtonsPage />,
              }
            ]
          },

          //  HEMATOLOGY/COAG PATHS
          { 
            path: 'hema_coag', 
            children: [

            ]
          },

          // MICROBIOLOGY PATHS
          {
            path: 'microbiology',
            children: [

            ]
          },

          // SEROLOGY PATHS
          {
            path: 'serology',
            children: [

            ]
          },

          { 
            path: 'UA_fluids', 
            children: [
              {
                path: 'qc_results',
                element: <UrinalysisQCResult link="UA_fluids" name="UA/Body Fluids" />,
              },
              {
                path: 'qualitative-analyte-input-page',
                element: <QualitativeAnalyteInputPage name="UA/Body Fluids" />,  
              },
              {
                path: 'simple-analyte-input-page',
                element: <UrinalysisTestInputPage name="UA/Body Fluids" />,  
              },
              {
                path: "qc_results/:link",
                element: <UABFLeveyAnalyteInputPage name="" />,
                loader: async ({ params }) => {
                  const { link } = params;
                  console.log("loader function: ", link);
                  return null;
                }
              },
              { 
                path: 'order_controls', 
                element: <UABFOrderControls /> 
              },
            
              {
                path: "qc_builder",
                element: <UrinalysisQCBuilder />,
              },
              {
                path: 'levey-jennings/:fileName/:lotNumber/:analyteName',
                element: <UrinalysisLeveyJennings />,
              },
              {
                path: "BFEdit_qc",
                element: <BFEditQC />,
              },
              {
                  path: "BFEdit_qc/:item",
                  element: <BFQualitativeInput name="CMP Level I" />,
                },
                {
                  path: "BFEdit_qc/levyjennings/:item",
                  element: <BFTestInputPage name="CMP Level I" />,
                },

              {
                path: "edit_qc",
                element: <UrinalysisEditQC />,
              },
              {
                path: "edit_qc/:item",
                element: <UrinalysisQualitativeInput name="CMP Level I" />,
              },
              {
                path: "edit_qc/levyjennings/:item",
                element: <UrinalysisTestInputPage name="CMP Level I" />,
              },
              
              {
                path: "build_qc/:item",
                element: <UrinalysisCustomQCBuild name="UA/Body Fluids" />,
              },
              {
                path: "custom_tests",
                element: <UrinalysisCustomTests />,
              },
              {
                path: "qc_types",
                element: <UrinalysisQCTypeButtonsPage />,
              },
              {
                path: "page_switcher",
                element: <UrinalysisPageSwitcher />, // Add the route for UrinalysisPageSwitcher
              }
            ]
          },




          // BLOOD BANK PATHS
          {
            path: 'blood_bank',
            children: [

            ]
          },

          // MOLECULAR PATHS
          {
            path: 'molecular',
            children: [

            ]
          },
          { path: 'unauthorized', element: <Unauthorized /> },
          { path: '*', element: <ErrorPage /> },
        ],
      },
    ]);
  }, [])

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
