import axios, { type AxiosInstance } from "axios";
import { toApiError } from "./errors";
import { tokenStore } from "./tokenStore";
import type { LotDraft, MisApi, QcLot, Report, Session, UserProfile } from "./types";

/** MisApi over HTTP. One axios instance; the JWT is attached to every request. */
export function createHttpApi(baseURL: string, onUnauthorized?: () => void): MisApi {
  const http: AxiosInstance = axios.create({ baseURL, timeout: 15000 });

  http.interceptors.request.use((cfg) => {
    const token = tokenStore.token();
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
  });
  http.interceptors.response.use(
    (r) => r,
    (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 401 && !String(err.config?.url).includes("/Auth/Login")) {
        onUnauthorized?.();
      }
      return Promise.reject(toApiError(err));
    },
  );

  const lotBody = (d: LotDraft) => ({ ...d, lotNumber: d.lotNumber.trim(), qcName: d.qcName.trim() });

  return {
    async login(username, password) {
      const { data } = await http.post<{ jwtToken: string; expiresAt: string; user: UserProfile }>("/Auth/Login", { username, password });
      return { token: data.jwtToken, expiresAt: data.expiresAt, user: data.user } satisfies Session;
    },
    async register(draft) {
      await http.post("/Auth/Register", draft);
    },
    async registerFaculty(draft) {
      await http.post("/Auth/RegisterFaculty", draft);
    },
    async me() {
      return (await http.get<UserProfile>("/Auth/Me")).data;
    },

    async listLots() {
      return (await http.get<QcLot[]>("/AdminQCLots")).data;
    },
    async getLot(id) {
      return (await http.get<QcLot>(`/AdminQCLots/${id}`)).data;
    },
    async createLot(draft) {
      return (await http.post<QcLot>("/AdminQCLots", lotBody(draft))).data;
    },
    async updateLot(id, draft) {
      return (await http.put<QcLot>(`/AdminQCLots/${id}`, lotBody(draft))).data;
    },
    async deleteLot(id) {
      await http.delete(`/AdminQCLots/${id}`);
    },

    async listReports(query) {
      return (await http.get<Report[]>("/Reports", { params: query })).data;
    },
    async getReport(id) {
      return (await http.get<Report>(`/Reports/${id}`)).data;
    },
    async orderRun(lotId) {
      return (await http.post<Report>("/Reports", { adminQCLotID: lotId })).data;
    },
    async saveResults(id, inputs, studentComment, runDate) {
      return (await http.put<Report>(`/Reports/${id}/results`, { inputs, studentComment, runDate })).data;
    },
    async submitRun(id) {
      return (await http.post<Report>(`/Reports/${id}/submit`)).data;
    },
    async discardRun(id) {
      await http.delete(`/Reports/${id}`);
    },
    async gradeRun(id, grade, facultyComment) {
      return (await http.post<Report>(`/Reports/${id}/grade`, { grade, facultyComment })).data;
    },
    async returnRun(id, facultyComment) {
      return (await http.post<Report>(`/Reports/${id}/return`, { facultyComment })).data;
    },
    async leveyJennings(id) {
      return (await http.get(`/Reports/${id}/levey-jennings`)).data;
    },

    async listStudents() {
      return (await http.get("/Students")).data;
    },
  };
}
