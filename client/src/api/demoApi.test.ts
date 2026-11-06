import { beforeEach, describe, expect, it } from "vitest";
import { createDemoApi } from "./demoApi";
import { tokenStore } from "./tokenStore";
import type { MisApi } from "./types";

let api: ReturnType<typeof createDemoApi>;

async function as(username: string) {
  const session = await api.login(username, username === "faculty" ? "Faculty123!" : "Student123!");
  tokenStore.save(session);
  return session.user;
}

const lotDraft = (lotNumber: string): Parameters<MisApi["createLot"]>[0] => ({
  lotNumber, qcName: "Demo Lipid Control", department: "Chemistry", isActive: true,
  openDate: new Date(Date.now() - 864e5).toISOString(), expirationDate: new Date(Date.now() + 90 * 864e5).toISOString(),
  analytes: [{ analyteName: "Cholesterol", analyteAcronym: "CHOL", unitOfMeasure: "mg/dL", mean: 200, stdDevi: 10, minLevel: 180, maxLevel: 220 }],
});

beforeEach(() => {
  localStorage.clear();
  api = createDemoApi(localStorage);
});

describe("demo API", () => {
  it("seeds synthetic users, lots and runs", async () => {
    await as("faculty");
    const lots = await api.listLots();
    expect(lots.map((l) => l.lotNumber)).toContain("BMP1-260901");
    expect((await api.listReports({ status: "Submitted" })).length).toBeGreaterThan(0);
  });

  it("rejects bad credentials", async () => {
    await expect(api.login("student", "wrong")).rejects.toMatchObject({ status: 401 });
  });

  it("runs the full loop: create lot → order → results → submit → grade → gradebook", async () => {
    await as("faculty");
    const lot = await api.createLot(lotDraft("DEMO-LIPID-01"));

    const student = await as("student");
    const run = await api.orderRun(lot.adminQCLotID);
    expect(run.status).toBe("InProgress");
    await expect(api.submitRun(run.reportID)).rejects.toMatchObject({ status: 409 });

    await api.saveResults(run.reportID, [{ analyteID: lot.analytes[0].analyteID, analyteValue: 205 }], "note");
    const submitted = await api.submitRun(run.reportID);
    expect(submitted.status).toBe("Submitted");
    await expect(api.saveResults(run.reportID, [{ analyteID: lot.analytes[0].analyteID, analyteValue: 1 }])).rejects.toMatchObject({ status: 409 });

    await as("faculty");
    const graded = await api.gradeRun(run.reportID, 91, "Nice");
    expect(graded).toMatchObject({ status: "Graded", grade: 91, studentName: `${student.firstname} ${student.lastname}` });

    await as("student");
    const book = await api.listReports({ status: "Graded" });
    expect(book.find((r) => r.reportID === run.reportID)?.grade).toBe(91);
    const lj = await api.leveyJennings(run.reportID);
    expect(lj[0].points).toHaveLength(1);
  });

  it("return → correct → resubmit mirrors the server's workflow rules", async () => {
    await as("faculty");
    const lot = await api.createLot(lotDraft("DEMO-LIPID-02"));
    await as("student");
    const run = await api.orderRun(lot.adminQCLotID);
    await api.saveResults(run.reportID, [{ analyteID: lot.analytes[0].analyteID, analyteValue: 260 }]);
    await api.submitRun(run.reportID);

    await as("faculty");
    await expect(api.returnRun(run.reportID, "  ")).rejects.toMatchObject({ status: 400 }); // feedback required
    const returned = await api.returnRun(run.reportID, "CHOL is +6 SD; check the entry.");
    expect(returned).toMatchObject({ status: "Returned", facultyComment: "CHOL is +6 SD; check the entry." });
    await expect(api.gradeRun(run.reportID, 80)).rejects.toMatchObject({ status: 409 }); // can't grade a returned run

    await as("student");
    await api.saveResults(run.reportID, [{ analyteID: lot.analytes[0].analyteID, analyteValue: 206 }]);
    expect((await api.submitRun(run.reportID)).status).toBe("Submitted");
    await expect(api.discardRun(run.reportID)).rejects.toMatchObject({ status: 409 }); // only drafts can be discarded
  });

  it("enforces roles and ownership like the server", async () => {
    await as("student");
    await expect(api.createLot(lotDraft("DEMO-NOPE-001"))).rejects.toMatchObject({ status: 403 });
    await expect(api.listStudents()).rejects.toMatchObject({ status: 403 });
    const alexRun = (await api.listReports())[0];

    await as("jlee");
    await expect(api.getReport(alexRun.reportID)).rejects.toMatchObject({ status: 404 });
    expect((await api.listReports()).some((r) => r.reportID === alexRun.reportID)).toBe(false);
  });

  it("blocks deleting lots that have runs and hides inactive lots from students", async () => {
    await as("faculty");
    const lots = await api.listLots();
    const used = lots.find((l) => l.reportCount > 0)!;
    await expect(api.deleteLot(used.adminQCLotID)).rejects.toMatchObject({ status: 409 });
    expect(lots.some((l) => !l.isActive)).toBe(true);

    await as("student");
    expect((await api.listLots()).every((l) => l.isActive)).toBe(true);
  });

  it("public registration creates a student account", async () => {
    await api.register({ username: "newbie", email: "newbie@mis.example.edu", password: "Newbie123", firstname: "New", lastname: "Bie", initials: "NB" });
    const session = await api.login("newbie", "Newbie123");
    expect(session.user.role).toBe("student");
    await expect(api.register({ username: "weak", email: "w@x.edu", password: "short", firstname: "W", lastname: "K", initials: "WK" })).rejects.toMatchObject({ status: 400 });
  });

  it("only faculty can create faculty accounts", async () => {
    const draft = { username: "tchen", email: "tchen@mis.example.edu", password: "Faculty456!", firstname: "Taylor", lastname: "Chen", initials: "TC" };
    await as("student");
    await expect(api.registerFaculty(draft)).rejects.toMatchObject({ status: 403 });
    await as("faculty");
    await api.registerFaculty(draft);
    const session = await api.login("tchen", "Faculty456!");
    expect(session.user.role).toBe("faculty");
    await expect(api.registerFaculty(draft)).rejects.toMatchObject({ status: 400 });
  });

  it("persists changes in localStorage and can reset", async () => {
    await as("faculty");
    await api.createLot(lotDraft("DEMO-PERSIST-1"));
    const reopened = createDemoApi(localStorage);
    tokenStore.save(await reopened.login("faculty", "Faculty123!"));
    expect((await reopened.listLots()).some((l) => l.lotNumber === "DEMO-PERSIST-1")).toBe(true);
    reopened.reset();
    tokenStore.save(await reopened.login("faculty", "Faculty123!"));
    expect((await reopened.listLots()).some((l) => l.lotNumber === "DEMO-PERSIST-1")).toBe(false);
  });

  it("plants a 2-2s glucose shift in the seed data so the LJ chart has something to teach", async () => {
    await as("student");
    const runs = await api.listReports({ status: "Submitted" });
    const bmp = runs.find((r) => r.lotNumber === "BMP1-260901")!;
    const series = (await api.leveyJennings(bmp.reportID)).find((s) => s.analyte.analyteAcronym === "GLU")!;
    const { evaluateSeries } = await import("../qc/westgard");
    const evaluated = evaluateSeries(series.points.map((p) => p.value), series.analyte.mean, series.analyte.stdDevi);
    expect(evaluated.some((e) => e.rules.includes("2-2s"))).toBe(true);
  });
});
