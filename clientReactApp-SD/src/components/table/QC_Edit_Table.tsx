import * as React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import axios from 'axios';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { CircularProgress } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import AppTheme from '../../shared-theme/AppTheme.tsx';
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';


interface QCData {
  adminQCLotID: string;
  lotNumber: string;
  openDate: string;
  closedDate: string;
  department: string;
  expirationDate: string;
  fileDate: string;
  qcName: string;
  isActive: boolean;
}

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'fixed',
    zIndex: -1,
    inset: 0,
    backgroundColor: theme.palette.mode === 'dark' ? '#457A64' : '#607D8B',
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

function formatValue(value: any) {
  return value === null || value === undefined || value === '' ? 'NULL' : value;
}

function LotTable() {
  const [details, setDetails] = React.useState<QCData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const handleEditClick = (adminQCLotID: string) => {
    console.log('Editing lot with ID:', adminQCLotID);
    navigate(`/qcedit/${adminQCLotID}`);
  };

  // Fetch data from the API when the component mounts
  React.useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const responseQCLots = await axios.get("http://localhost:5029/api/AdminQCLots");
        const dataQCLots = responseQCLots.data;
        console.log("QC Lots", dataQCLots);
        setDetails(dataQCLots);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBackendData();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <>
      <Typography variant="h6" sx={{ marginBottom: 2 , padding: 0, border: 0,}}>
        Quality Control Panels Available to Edit
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="QC table">
          <TableHead>
            <TableRow>
              <TableCell>Panel Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Open</TableCell>
              <TableCell>Closed</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Active Panel?</TableCell>
              <TableCell>Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {details.map((row) => (
              <TableRow key={row.adminQCLotID}>
                <TableCell>{formatValue(row.qcName)}</TableCell>
                <TableCell>{formatValue(row.department)}</TableCell>
                <TableCell>{formatValue(row.openDate)}</TableCell>
                <TableCell>{formatValue(row.closedDate)}</TableCell>
                <TableCell>{formatValue(row.expirationDate)}</TableCell>
                <TableCell>{row.isActive ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    onClick={() => handleEditClick(row.adminQCLotID)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default function QC_Edit_Table(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <SignInContainer direction="column">
        <LotTable />
      </SignInContainer>
    </AppTheme>
  );
}
