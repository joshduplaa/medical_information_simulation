// Mirrors the API DTOs (JSON is camelCase; enums are serialized as strings).

export const DEPARTMENTS = ["Chemistry", "Serology", "Blood_Bank", "Hematology", "Microbiology", "Molecular", "Urinalysis"] as const;
export type Department = (typeof DEPARTMENTS)[number];

export type ReportStatus = "InProgress" | "Submitted" | "Returned" | "Graded";
export type Role = "faculty" | "student";

export interface UserProfile {
  userID: string;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  initials: string;
  role: Role;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface Analyte {
  analyteID: string;
  analyteName: string;
  analyteAcronym: string;
  unitOfMeasure: string;
  minLevel: number;
  maxLevel: number;
  mean: number;
  stdDevi: number;
  adminQCLotID: string;
}

export interface QcLot {
  adminQCLotID: string;
  qcName: string;
  lotNumber: string;
  openDate: string;
  closedDate: string | null;
  fileDate: string | null;
  expirationDate: string;
  isActive: boolean;
  department: Department;
  analytes: Analyte[];
  reportCount: number;
}

export interface AnalyteInputValue {
  analyteID: string;
  analyteName: string;
  analyteValue: number;
}

export interface Report {
  reportID: string;
  studentID: string;
  studentName: string;
  adminQCLotID: string;
  qcName: string;
  lotNumber: string;
  department: Department;
  status: ReportStatus;
  createdDate: string;
  runDate: string;
  submittedDate: string | null;
  studentComment: string | null;
  grade: number | null;
  facultyComment: string | null;
  reviewedByAdminID: string | null;
  reviewedDate: string | null;
  analytes: Analyte[];
  analyteInputs: AnalyteInputValue[];
}

export interface LjPoint {
  reportID: string;
  runDate: string;
  value: number;
  status: ReportStatus;
}

export interface LjSeries {
  analyte: Analyte;
  points: LjPoint[];
}

export interface Student {
  studentID: string;
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  initials: string;
}

export interface AnalyteDraft {
  analyteID?: string;
  analyteName: string;
  analyteAcronym: string;
  unitOfMeasure: string;
  minLevel: number;
  maxLevel: number;
  mean: number;
  stdDevi: number;
}

export interface LotDraft {
  lotNumber: string;
  qcName: string;
  department: Department;
  openDate: string;
  expirationDate: string;
  isActive: boolean;
  analytes: AnalyteDraft[];
}

export interface RegisterDraft {
  username: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  initials: string;
}

export interface ResultInput {
  analyteID: string;
  analyteValue: number;
}

export interface ReportQuery {
  status?: ReportStatus;
  studentId?: string;
}

/** Everything the UI needs from the backend. Implemented over HTTP and, for demo mode, in the browser. */
export interface MisApi {
  login(username: string, password: string): Promise<Session>;
  register(draft: RegisterDraft): Promise<void>;
  /** Faculty only: creates another faculty account. */
  registerFaculty(draft: RegisterDraft): Promise<void>;
  me(): Promise<UserProfile>;

  listLots(): Promise<QcLot[]>;
  getLot(id: string): Promise<QcLot>;
  createLot(draft: LotDraft): Promise<QcLot>;
  updateLot(id: string, draft: LotDraft): Promise<QcLot>;
  deleteLot(id: string): Promise<void>;

  listReports(query?: ReportQuery): Promise<Report[]>;
  getReport(id: string): Promise<Report>;
  orderRun(lotId: string): Promise<Report>;
  saveResults(id: string, inputs: ResultInput[], studentComment?: string, runDate?: string): Promise<Report>;
  submitRun(id: string): Promise<Report>;
  discardRun(id: string): Promise<void>;
  gradeRun(id: string, grade: number, facultyComment?: string): Promise<Report>;
  returnRun(id: string, facultyComment: string): Promise<Report>;
  leveyJennings(id: string): Promise<LjSeries[]>;

  listStudents(): Promise<Student[]>;
}
