import { ApiError } from "./errors";
import { tokenStore } from "./tokenStore";
import type {
  Analyte, AnalyteDraft, LjSeries, LotDraft, MisApi, QcLot, Report, ReportStatus, Session, Student, UserProfile,
} from "./types";

/**
 * Browser-only implementation of MisApi used when VITE_DEMO_MODE=true (the public demo on Firebase Hosting,
 * which has no API server). It mirrors the server's rules (api/.../Services/ReportWorkflow.cs and the
 * controllers' role/ownership checks) over a synthetic dataset stored in this browser's localStorage.
 * Nothing here is sent anywhere; "Reset demo data" on the Account page restores the original dataset.
 */

const STORAGE_KEY = "mis.demo.v1";
export const DEMO_PASSWORDS = { faculty: "Faculty123!", student: "Student123!" } as const;

interface DemoUser extends UserProfile { password: string }
type StoredReport = Omit<Report, "studentName" | "qcName" | "lotNumber" | "department" | "analytes">;
interface State { users: DemoUser[]; lots: QcLot[]; reports: StoredReport[] }

// ----- deterministic synthetic data -------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let idCounter = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `demo-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const day = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

type Spec = [name: string, acronym: string, unit: string, mean: number, sd: number];

function makeLot(name: string, lotNumber: string, department: QcLot["department"], openDaysAgo: number, expiresInDays: number, specs: Spec[], today: number): QcLot {
  const id = newId();
  return {
    adminQCLotID: id, qcName: name, lotNumber, department, isActive: true, closedDate: null,
    openDate: iso(today - openDaysAgo * day), fileDate: iso(today - openDaysAgo * day), expirationDate: iso(today + expiresInDays * day),
    reportCount: 0,
    analytes: specs.map(([analyteName, analyteAcronym, unitOfMeasure, mean, stdDevi]) => ({
      analyteID: newId(), adminQCLotID: id, analyteName, analyteAcronym, unitOfMeasure, mean, stdDevi,
      minLevel: round(mean - 2 * stdDevi, 2), maxLevel: round(mean + 2 * stdDevi, 2),
    })),
  };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

export function buildDemoState(now = Date.now()): State {
  const today = new Date(new Date(now).toISOString().slice(0, 10)).getTime();
  const rand = mulberry32(20261105);
  const gaussian = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

  const user = (username: string, firstname: string, lastname: string, role: UserProfile["role"]): DemoUser => ({
    userID: newId(), username, email: `${username}@mis.example.edu`, firstname, lastname,
    initials: firstname[0] + lastname[0], role, password: DEMO_PASSWORDS[role],
  });
  const faculty = user("faculty", "Morgan", "Reyes", "faculty");
  const alex = user("student", "Alex", "Rivera", "student");
  const jordan = user("jlee", "Jordan", "Lee", "student");
  const sam = user("spatel", "Sam", "Patel", "student");

  const bmp1 = makeLot("BMP Level I", "BMP1-260901", "Chemistry", 45, 320, [
    ["Sodium", "Na", "mmol/L", 140, 1.5], ["Potassium", "K", "mmol/L", 4.2, 0.1], ["Chloride", "Cl", "mmol/L", 102, 1.5],
    ["Carbon Dioxide", "CO2", "mmol/L", 25, 1.0], ["Blood Urea Nitrogen", "BUN", "mg/dL", 15, 0.8],
    ["Creatinine", "CREA", "mg/dL", 1.0, 0.05], ["Glucose", "GLU", "mg/dL", 95, 2.5], ["Calcium", "CA", "mg/dL", 9.5, 0.15],
  ], today);
  const bmp2 = makeLot("BMP Level II", "BMP2-260901", "Chemistry", 45, 320, [
    ["Sodium", "Na", "mmol/L", 155, 1.8], ["Potassium", "K", "mmol/L", 6.5, 0.15], ["Glucose", "GLU", "mg/dL", 280, 6.0], ["Creatinine", "CREA", "mg/dL", 5.8, 0.2],
  ], today);
  const sars = makeLot("SARS-CoV-2 PCR Positive Control", "MOL-CV2-2611", "Molecular", 30, 150, [
    ["N gene Ct", "N", "Ct", 28.0, 0.8], ["RdRp gene Ct", "RdRp", "Ct", 29.5, 0.9], ["RNase P (internal control) Ct", "RP", "Ct", 26.0, 0.7],
  ], today);
  const sti = makeLot("CT/NG NAAT Positive Control", "MOL-STI-2610", "Molecular", 30, 150, [
    ["Chlamydia trachomatis Ct", "CT", "Ct", 30.5, 1.0], ["Neisseria gonorrhoeae Ct", "NG", "Ct", 31.2, 1.1],
  ], today);
  const cbc = makeLot("CBC Control Normal", "HEM-CBCN-2609", "Hematology", 20, 60, [
    ["White Blood Cells", "WBC", "x10^3/uL", 7.0, 0.3], ["Hemoglobin", "HGB", "g/dL", 13.5, 0.3], ["Platelets", "PLT", "x10^3/uL", 250, 12],
  ], today);
  const oldBmp: QcLot = {
    ...makeLot("BMP Level I", "BMP1-260301", "Chemistry", 230, -46, [], today),
    isActive: false, closedDate: iso(today - 45 * day),
  };
  oldBmp.analytes = bmp1.analytes.map((a) => ({ ...a, analyteID: newId(), adminQCLotID: oldBmp.adminQCLotID }));

  const reports: StoredReport[] = [];
  const addRun = (student: DemoUser, lot: QcLot, runMs: number, status: ReportStatus, shifts: Record<string, number> = {}, fraction = 1) => {
    const reportID = newId();
    const analytes = [...lot.analytes].sort((a, b) => a.analyteName.localeCompare(b.analyteName));
    const count = Math.ceil(analytes.length * fraction);
    reports.push({
      reportID, studentID: student.userID, adminQCLotID: lot.adminQCLotID, status,
      createdDate: iso(runMs), runDate: iso(runMs),
      submittedDate: status === "InProgress" ? null : iso(runMs + 3600e3),
      studentComment: status === "InProgress" ? null : "Controls run on analyzer 1 after daily maintenance.",
      grade: status === "Graded" ? 85 + Math.floor(rand() * 16) : null,
      facultyComment: status === "Graded" ? "Results documented correctly." : status === "Returned" ? "Re-check the chloride value against the analyzer printout and resubmit." : null,
      reviewedByAdminID: status === "Graded" || status === "Returned" ? faculty.userID : null,
      reviewedDate: status === "Graded" || status === "Returned" ? iso(runMs + 5 * 3600e3) : null,
      analyteInputs: analytes.slice(0, count).map((a) => ({
        analyteID: a.analyteID, analyteName: a.analyteName,
        analyteValue: round(a.mean + (gaussian() * (a.analyteName in shifts ? 0.15 : 0.8) + (shifts[a.analyteName] ?? 0)) * a.stdDevi, a.stdDevi < 0.2 ? 2 : 1),
      })),
    });
  };

  for (let d = 0; d < 14; d++) {
    const status: ReportStatus = d < 10 ? "Graded" : d <= 11 ? "Submitted" : d === 12 ? "Returned" : "InProgress";
    const shifts: Record<string, number> = {};
    if (d === 10 || d === 11) shifts.Glucose = 2.4; // planted 2-2s
    if (d === 6) shifts.Potassium = 3.3;            // planted 1-3s
    addRun(alex, bmp1, today - (14 - d) * day + 15 * 3600e3, status, shifts, status === "InProgress" ? 0.5 : 1);
  }
  for (let d = 0; d < 6; d++) addRun(alex, sars, today - (6 - d) * day + 16 * 3600e3, d < 5 ? "Graded" : "Submitted");
  for (let d = 0; d < 8; d++) addRun(jordan, bmp1, today - (8 - d) * day + 17 * 3600e3, d < 7 ? "Graded" : "Submitted");
  for (let d = 0; d < 5; d++) addRun(sam, cbc, today - (5 - d) * day + 18 * 3600e3, d < 4 ? "Graded" : "Submitted");

  return { users: [faculty, alex, jordan, sam], lots: [bmp1, bmp2, sars, sti, cbc, oldBmp], reports };
}

// ----- the fake backend -------------------------------------------------------------------------

export function createDemoApi(storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage): MisApi & { reset(): void } {
  let memory: State | null = null;

  const load = (): State => {
    if (memory) return memory;
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) return (memory = JSON.parse(raw) as State);
    } catch { /* fall through to a fresh dataset */ }
    memory = buildDemoState();
    persist(memory);
    return memory;
  };
  const persist = (s: State) => {
    memory = s;
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* storage full/blocked: keep in memory */ }
  };
  const mutate = <T,>(fn: (s: State) => T): T => {
    const s = load();
    const result = fn(s);
    persist(s);
    return result;
  };

  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(structuredClone(v)), 120));
  const fail = (message: string, status: number): never => { throw new ApiError(message, status); };

  const currentUser = (s: State): DemoUser => {
    const token = tokenStore.token();
    const user = token?.startsWith("demo:") ? s.users.find((u) => u.userID === token.slice(5)) : undefined;
    return user ?? fail("Your session has expired. Please sign in again.", 401);
  };
  const requireFaculty = (s: State) => {
    const u = currentUser(s);
    if (u.role !== "faculty") fail("You do not have permission to do that.", 403);
    return u;
  };
  const requireStudent = (s: State) => {
    const u = currentUser(s);
    if (u.role !== "student") fail("You do not have permission to do that.", 403);
    return u;
  };

  const withCounts = (s: State, lot: QcLot): QcLot => ({ ...lot, reportCount: s.reports.filter((r) => r.adminQCLotID === lot.adminQCLotID).length });

  const expand = (s: State, r: StoredReport): Report => {
    const lot = s.lots.find((l) => l.adminQCLotID === r.adminQCLotID)!;
    const student = s.users.find((u) => u.userID === r.studentID);
    return {
      ...r, studentName: student ? `${student.firstname} ${student.lastname}` : "", qcName: lot.qcName,
      lotNumber: lot.lotNumber, department: lot.department, analytes: lot.analytes,
    };
  };

  /** Students may only touch their own runs; other students' runs look like they do not exist (404). */
  const findReport = (s: State, id: string, mode: "view" | "own") => {
    const u = currentUser(s);
    const r = s.reports.find((x) => x.reportID === id);
    if (!r) return fail("Not found.", 404);
    if ((mode === "own" || u.role !== "faculty") && r.studentID !== u.userID) return fail("Not found.", 404);
    return r;
  };
  const lotOf = (s: State, r: StoredReport) => s.lots.find((l) => l.adminQCLotID === r.adminQCLotID)!;
  const editable = (r: StoredReport) => r.status === "InProgress" || r.status === "Returned";

  const validateLot = (s: State, d: LotDraft, existingId?: string) => {
    if (!existingId && d.lotNumber.trim().length < 8) fail("Lot number must be at least 8 characters", 400);
    if (!d.qcName.trim()) fail("QC name is required.", 400);
    if (new Date(d.expirationDate) <= new Date(d.openDate)) fail("Expiration date must be after the open date.", 400);
    if (d.analytes.length === 0) fail("A QC lot needs at least one analyte", 400);
    for (const a of d.analytes) {
      if (!a.analyteName.trim() || !a.analyteAcronym.trim() || !a.unitOfMeasure.trim()) fail("Every analyte needs a name, acronym and unit.", 400);
      if (!(a.stdDevi > 0)) fail(`${a.analyteName}: standard deviation must be greater than 0.`, 400);
      if (a.maxLevel < a.minLevel) fail(`${a.analyteName}: max level must be greater than or equal to min level.`, 400);
    }
    if (!existingId && s.lots.some((l) => l.lotNumber === d.lotNumber.trim())) fail("Lot number already exists.", 409);
  };
  const toAnalyte = (lotId: string, a: AnalyteDraft): Analyte => ({ ...a, analyteID: a.analyteID ?? newId(), adminQCLotID: lotId });

  return {
    reset() {
      persist(buildDemoState());
      tokenStore.clear();
    },

    async login(username, password) {
      const s = load();
      const needle = username.trim().toLowerCase();
      const u = s.users.find((x) => x.username.toLowerCase() === needle || x.email.toLowerCase() === needle);
      if (!u || u.password !== password) fail("Invalid username or password.", 401);
      const { password: _pw, ...user } = u!;
      void _pw;
      return delay<Session>({ token: `demo:${u!.userID}`, expiresAt: iso(Date.now() + 8 * 3600e3), user });
    },
    async register(d) {
      mutate((s) => {
        if (s.users.some((u) => u.username.toLowerCase() === d.username.toLowerCase())) fail("That username is already taken.", 400);
        if (s.users.some((u) => u.email.toLowerCase() === d.email.toLowerCase())) fail("An account with that email already exists.", 400);
        if (d.password.length < 8 || !/[a-z]/.test(d.password) || !/[A-Z]/.test(d.password) || !/\d/.test(d.password)) {
          fail("Password must be at least 8 characters with an uppercase letter, a lowercase letter, and a digit.", 400);
        }
        s.users.push({ ...d, userID: newId(), role: "student" }); // public sign-up is always a student
      });
      return delay(undefined);
    },
    async me() {
      const { password: _pw, ...user } = currentUser(load());
      void _pw;
      return delay(user);
    },

    async listLots() {
      const s = load();
      const u = currentUser(s);
      const lots = s.lots.filter((l) => u.role === "faculty" || l.isActive).map((l) => withCounts(s, l));
      lots.sort((a, b) => a.department.localeCompare(b.department) || a.qcName.localeCompare(b.qcName) || b.openDate.localeCompare(a.openDate));
      return delay(lots);
    },
    async getLot(id) {
      const s = load();
      currentUser(s);
      const lot = s.lots.find((l) => l.adminQCLotID === id) ?? fail("QC lot not found.", 404);
      return delay(withCounts(s, lot));
    },
    async createLot(d) {
      const lot = mutate((s) => {
        requireFaculty(s);
        validateLot(s, d);
        const id = newId();
        if (d.isActive) {
          for (const l of s.lots) {
            if (l.isActive && l.department === d.department && l.qcName.toLowerCase() === d.qcName.trim().toLowerCase()) {
              l.isActive = false;
              l.closedDate = iso(Date.now());
            }
          }
        }
        const created: QcLot = {
          adminQCLotID: id, qcName: d.qcName.trim(), lotNumber: d.lotNumber.trim(), department: d.department,
          openDate: d.openDate, expirationDate: d.expirationDate, fileDate: iso(Date.now()), closedDate: null,
          isActive: d.isActive, reportCount: 0, analytes: d.analytes.map((a) => toAnalyte(id, a)),
        };
        s.lots.push(created);
        return created;
      });
      return delay(lot);
    },
    async updateLot(id, d) {
      const lot = mutate((s) => {
        requireFaculty(s);
        validateLot(s, d, id);
        const lot = s.lots.find((l) => l.adminQCLotID === id) ?? fail("QC lot not found.", 404);
        const hasRuns = s.reports.some((r) => r.adminQCLotID === id);
        const kept = new Set(d.analytes.map((a) => a.analyteID).filter(Boolean));
        if (hasRuns && lot.analytes.some((a) => !kept.has(a.analyteID))) fail("Analytes cannot be removed from a lot that already has student runs.", 409);
        Object.assign(lot, {
          qcName: d.qcName.trim(), department: d.department, openDate: d.openDate, expirationDate: d.expirationDate,
          isActive: d.isActive, closedDate: d.isActive ? null : lot.closedDate ?? iso(Date.now()),
          analytes: d.analytes.map((a) => toAnalyte(id, a)),
        });
        return withCounts(s, lot);
      });
      return delay(lot);
    },
    async deleteLot(id) {
      mutate((s) => {
        requireFaculty(s);
        if (s.reports.some((r) => r.adminQCLotID === id)) fail("This lot has student runs. Deactivate it instead of deleting it.", 409);
        s.lots = s.lots.filter((l) => l.adminQCLotID !== id);
      });
      return delay(undefined);
    },

    async listReports(query = {}) {
      const s = load();
      const u = currentUser(s);
      let list = s.reports;
      if (u.role === "student") list = list.filter((r) => r.studentID === u.userID);
      else if (query.studentId) list = list.filter((r) => r.studentID === query.studentId);
      if (query.status) list = list.filter((r) => r.status === query.status);
      const sorted = [...list].sort((a, b) =>
        u.role === "faculty" ? (b.submittedDate ?? b.runDate).localeCompare(a.submittedDate ?? a.runDate) : b.runDate.localeCompare(a.runDate));
      return delay(sorted.map((r) => expand(s, r)));
    },
    async getReport(id) {
      const s = load();
      return delay(expand(s, findReport(s, id, "view")));
    },
    async orderRun(lotId) {
      const r = mutate((s) => {
        const u = requireStudent(s);
        const lot = s.lots.find((l) => l.adminQCLotID === lotId) ?? fail("QC lot not found.", 404);
        if (!lot.isActive) fail("This QC lot is not active.", 409);
        if (new Date(lot.expirationDate).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime()) fail("This QC lot has expired.", 409);
        const now = iso(Date.now());
        const report: StoredReport = {
          reportID: newId(), studentID: u.userID, adminQCLotID: lotId, status: "InProgress", createdDate: now, runDate: now,
          submittedDate: null, studentComment: null, grade: null, facultyComment: null, reviewedByAdminID: null, reviewedDate: null,
          analyteInputs: [],
        };
        s.reports.push(report);
        return expand(s, report);
      });
      return delay(r);
    },
    async saveResults(id, inputs, studentComment, runDate) {
      const r = mutate((s) => {
        requireStudent(s);
        const report = findReport(s, id, "own");
        if (!editable(report)) fail(`Results can only be edited while the run is In Progress or Returned (it is ${report.status}).`, 409);
        const lot = lotOf(s, report);
        if (new Set(inputs.map((i) => i.analyteID)).size !== inputs.length) fail("Each analyte can only have one result per run.", 409);
        for (const input of inputs) {
          const analyte = lot.analytes.find((a) => a.analyteID === input.analyteID) ?? fail("Analyte does not belong to this QC lot.", 409);
          if (!Number.isFinite(input.analyteValue)) fail(`A numeric value is required for ${analyte.analyteName}.`, 409);
          const existing = report.analyteInputs.find((x) => x.analyteID === input.analyteID);
          if (existing) existing.analyteValue = input.analyteValue;
          else report.analyteInputs.push({ analyteID: input.analyteID, analyteName: analyte.analyteName, analyteValue: input.analyteValue });
        }
        if (studentComment !== undefined) report.studentComment = studentComment.trim();
        if (runDate) report.runDate = runDate;
        return expand(s, report);
      });
      return delay(r);
    },
    async submitRun(id) {
      const r = mutate((s) => {
        requireStudent(s);
        const report = findReport(s, id, "own");
        if (!editable(report)) fail(`Only In Progress or Returned runs can be submitted (it is ${report.status}).`, 409);
        const missing = lotOf(s, report).analytes.filter((a) => !report.analyteInputs.some((i) => i.analyteID === a.analyteID));
        if (missing.length) fail(`Enter a result for every analyte before submitting. Missing: ${missing.map((m) => m.analyteName).join(", ")}.`, 409);
        report.status = "Submitted";
        report.submittedDate = iso(Date.now());
        return expand(s, report);
      });
      return delay(r);
    },
    async discardRun(id) {
      mutate((s) => {
        requireStudent(s);
        const report = findReport(s, id, "own");
        if (report.status !== "InProgress") fail("Only runs that are still In Progress can be discarded.", 409);
        s.reports = s.reports.filter((r) => r.reportID !== id);
      });
      return delay(undefined);
    },
    async gradeRun(id, grade, facultyComment) {
      const r = mutate((s) => {
        const u = requireFaculty(s);
        const report = s.reports.find((x) => x.reportID === id) ?? fail("Not found.", 404);
        if (report.status !== "Submitted") fail(`Only submitted runs can be graded (it is ${report.status}).`, 409);
        if (!Number.isInteger(grade) || grade < 0 || grade > 100) fail("Grade must be between 0 and 100.", 400);
        Object.assign(report, { status: "Graded", grade, facultyComment: facultyComment?.trim() ?? null, reviewedByAdminID: u.userID, reviewedDate: iso(Date.now()) });
        return expand(s, report);
      });
      return delay(r);
    },
    async returnRun(id, facultyComment) {
      const r = mutate((s) => {
        const u = requireFaculty(s);
        const report = s.reports.find((x) => x.reportID === id) ?? fail("Not found.", 404);
        if (report.status !== "Submitted") fail(`Only submitted runs can be returned (it is ${report.status}).`, 409);
        if (!facultyComment.trim()) fail("Explain what the student should fix when returning a run.", 400);
        Object.assign(report, { status: "Returned", facultyComment: facultyComment.trim(), reviewedByAdminID: u.userID, reviewedDate: iso(Date.now()) });
        return expand(s, report);
      });
      return delay(r);
    },
    async leveyJennings(id) {
      const s = load();
      const report = findReport(s, id, "view");
      const lot = lotOf(s, report);
      const history = s.reports
        .filter((r) => r.studentID === report.studentID && r.adminQCLotID === report.adminQCLotID && (r.status !== "InProgress" || r.reportID === id))
        .sort((a, b) => a.runDate.localeCompare(b.runDate));
      const series: LjSeries[] = [...lot.analytes]
        .sort((a, b) => a.analyteName.localeCompare(b.analyteName))
        .map((analyte) => ({
          analyte,
          points: history.flatMap((h) => h.analyteInputs.filter((i) => i.analyteID === analyte.analyteID)
            .map((i) => ({ reportID: h.reportID, runDate: h.runDate, value: i.analyteValue, status: h.status }))),
        }));
      return delay(series);
    },

    async listStudents() {
      const s = load();
      requireFaculty(s);
      const students: Student[] = s.users.filter((u) => u.role === "student")
        .map(({ userID, email, username, firstname, lastname, initials }) => ({ studentID: userID, email, username, firstname, lastname, initials }))
        .sort((a, b) => a.lastname.localeCompare(b.lastname));
      return delay(students);
    },
  };
}
