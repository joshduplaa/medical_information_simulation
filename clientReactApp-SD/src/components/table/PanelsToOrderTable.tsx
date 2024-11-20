import * as React from "react";
import CssBaseline from "@mui/material/CssBaseline";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import AppTheme from "../../shared-theme/AppTheme";
import ColorModeSelect from "../../shared-theme/ColorModeSelect";
import TextField from "@mui/material/TextField";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import QCSubmitButton from "./Buttons/QCSubmitButton";
import SubmittedQCTable from "./SubmittedQCTable";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";

const Card = styled(MuiCard)(({ theme }) => ({
  margin: "50px",
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  [theme.breakpoints.up("sm")]: {
    width: "150px",
  },
  [theme.breakpoints.up("lg")]: {
    width: "300px",
  },
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

const DataTableContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  alignSelf: "center",
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "fixed",
    zIndex: -1,
    inset: 0,
    backgroundColor: theme.palette.mode === "dark" ? "#457A64" : "#607D8B",
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

const getItemsFromLocalStorage = () => {
  const storedItems = localStorage.getItem("selectedQualityControls");
  if (storedItems) {
    const selectedItems = JSON.parse(storedItems) as string[]; // Expecting an array of strings (panel names)
    return selectedItems.map((panelName, index) => ({
      id: index + 1,
      description: panelName, // Use the panel name directly
      value: "", // Initialize value field for user input
    }));
  }
  return [];
};
export default function PanelsToOrderTable(props: { disableCustomTheme?: boolean }) {
  const [items, setItems] = React.useState(getItemsFromLocalStorage());

  // Function to fetch analytes based on selected panel names
  const fetchAnalytesForPanels = async (panelNames: string[]) => {
    try {
      console.log("Fetching analytes for panels:", panelNames);
  
      // Normalize panelNames (lowercase and trim)
      const normalizedPanelNames = panelNames.map((name) => name.trim().toLowerCase());
  
      // Fetch AdminQCLots to map QCName -> AdminQCLotID
      const responseQCLots = await axios.get("http://localhost:5029/api/AdminQCLots");
      const adminQCLots = responseQCLots.data;
      console.log("AdminQCLots Data:", adminQCLots);
  
      // Create a mapping of QCName to AdminQCLotID (normalize QCName)
      const qcNameToLotId = adminQCLots.reduce((map: any, lot: any) => {
        const normalizedQCName = lot.QCName?.trim().toLowerCase(); // Normalize QCName
        if (normalizedQCName) {
          map[normalizedQCName] = lot.AdminQCLotID;
        }
        return map;
      }, {});
      console.log("QCName to AdminQCLotID Mapping:", qcNameToLotId);
  
      // Log each mapping attempt
      normalizedPanelNames.forEach((name) => {
        console.log(`Mapping normalized QCName "${name}" to AdminQCLotID:`, qcNameToLotId[name]);
      });
  
      // Get the AdminQCLotIDs for the selected panel names
      const selectedLotIds = normalizedPanelNames.map((name) => qcNameToLotId[name]).filter(Boolean);
      console.log("Selected AdminQCLotIDs:", selectedLotIds);
  
      // Fetch all analytes
      const responseAnalytes = await axios.get("http://localhost:5029/api/Analytes");
      const allAnalytes = responseAnalytes.data;
      console.log("Fetched Analytes Data:", allAnalytes);
  
      // Log AdminQCLotID comparison for each analyte
      allAnalytes.forEach((analyte) => {
        console.log(
          `Checking Analyte AdminQCLotID "${analyte.AdminQCLotID}" against Selected Lot IDs:`,
          selectedLotIds.includes(analyte.AdminQCLotID)
        );
      });
  
      // Filter analytes by matching AdminQCLotID
      const filteredAnalytes = allAnalytes.filter((analyte: any) =>
        selectedLotIds.includes(analyte.AdminQCLotID)
      );
      console.log("Filtered Analytes for Panels:", filteredAnalytes);
  
      return filteredAnalytes;
    } catch (error) {
      console.error("Error fetching analytes:", error);
      return [];
    }
  };
  
  const handleSubmitQC = async () => {
    console.log("Submitting QC values:", items);

    // Get panel names from the selected items
    const selectedPanelNames = items.map((item) => item.description);
    console.log("Selected Panel Names:", selectedPanelNames);

    // Fetch analytes for the selected panels
    const analytes = await fetchAnalytesForPanels(selectedPanelNames);
    console.log("Fetched Analytes for Submission:", analytes);

    // Build the submission object
    const submissionWithTimestamp = {
      items, // QC panels
      analytes, // Associated analytes
      submittedAt: new Date().toISOString(), // Timestamp
    };

    console.log("Submission Being Stored:", submissionWithTimestamp);

    // Retrieve existing submissions from localStorage
    const existingSubmissions = JSON.parse(localStorage.getItem("SubmittedQCs") || "[]");

    // Append the new submission
    const updatedSubmissions = [...existingSubmissions, submissionWithTimestamp];

    // Save the updated submissions to localStorage
    localStorage.setItem("SubmittedQCs", JSON.stringify(updatedSubmissions));

    // Log the updated localStorage
    console.log("Updated localStorage (SubmittedQCs):", JSON.parse(localStorage.getItem("SubmittedQCs")));

    alert("Quality Control values submitted successfully.");

    // Reset the form
    setItems(getItemsFromLocalStorage());
    location.reload();
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: "absolute", top: "6.5rem", left: "2rem" }} />
      <DataTableContainer direction="column" sx={{ alignItems: "center" }}>
        <Typography variant="h1" component="div">
          Quality Control Panels to be ordered
        </Typography>
        <Grid container spacing={3}>
          {items.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" component="div">
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid container direction="column" sx={{ alignItems: "center" }}>
          <QCSubmitButton onSubmitQC={handleSubmitQC} />
        </Grid>
        <Grid container direction="column" sx={{ alignItems: "center" }}>
          <SubmittedQCTable />
        </Grid>
      </DataTableContainer>
    </AppTheme>
  );
}