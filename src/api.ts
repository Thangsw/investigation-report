import axios from 'axios';
import type { Report, Investigator, ReportFormData } from './types';

export const api = {
  // ── Reports ──────────────────────────────────────────────────────────────
  getReports: () =>
    axios.get<Report[]>('/api/reports').then(r => r.data),

  createReport: (data: ReportFormData) =>
    axios.post<{ data: Report }>('/api/reports', data).then(r => r.data.data),

  updateReport: (id: string, data: Partial<ReportFormData>) =>
    axios.put<{ data: Report }>(`/api/reports/${id}`, data).then(r => r.data.data),

  deleteReport: (id: string) =>
    axios.delete(`/api/reports/${id}`),

  exportExcel: () => {
    window.location.href = '/api/reports/export';
  },

  // ── Investigators ─────────────────────────────────────────────────────────
  getInvestigators: () =>
    axios.get<Investigator[]>('/api/investigators').then(r => r.data),

  createInvestigator: (name: string) =>
    axios.post<{ data: Investigator }>('/api/investigators', { name }).then(r => r.data.data),

  updateInvestigator: (id: string, name: string) =>
    axios.put<{ data: Investigator }>(`/api/investigators/${id}`, { name }).then(r => r.data.data),

  deleteInvestigator: (id: string) =>
    axios.delete(`/api/investigators/${id}`),
};
