import axios from 'axios';
import type { Report, Investigator, ReportFormData, AppConfig, PendingChange } from './types';

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

  exportExcel: (filters?: Partial<Record<'dtvName' | 'loaiHoSo' | 'doi' | 'toBanDia', string>>) => {
    const qs = filters
      ? new URLSearchParams(
          Object.entries(filters).filter(([, v]) => v) as [string, string][],
        ).toString()
      : '';
    window.location.href = `/api/reports/export${qs ? `?${qs}` : ''}`;
  },

  // ── Config ───────────────────────────────────────────────────────────────
  getConfig: () =>
    axios.get<AppConfig>('/api/config').then(r => r.data),

  updateConfig: (config: Partial<AppConfig>) =>
    axios.post<AppConfig>('/api/config', config).then(r => r.data),

  // ── Investigators ─────────────────────────────────────────────────────────
  getInvestigators: () =>
    axios.get<Investigator[]>('/api/investigators').then(r => r.data),

  createInvestigator: (name: string) =>
    axios.post<{ data: Investigator }>('/api/investigators', { name }).then(r => r.data.data),

  updateInvestigator: (id: string, name: string) =>
    axios.put<{ data: Investigator }>(`/api/investigators/${id}`, { name }).then(r => r.data.data),

  deleteInvestigator: (id: string) =>
    axios.delete(`/api/investigators/${id}`),

  // ── Pending Changes ───────────────────────────────────────────────────────
  getPendingChanges: () =>
    axios.get<PendingChange[]>('/api/pending-changes').then(r => r.data),

  createPendingChange: (data: { type: 'edit' | 'delete'; reportId: string; reportSnapshot: Report; newData?: Partial<ReportFormData>; requestedBy: string }) =>
    axios.post<{ data: PendingChange }>('/api/pending-changes', data).then(r => r.data.data),

  approvePendingChange: (id: string) =>
    axios.put<{ data: PendingChange }>(`/api/pending-changes/${id}/approve`).then(r => r.data.data),

  rejectPendingChange: (id: string) =>
    axios.put<{ data: PendingChange }>(`/api/pending-changes/${id}/reject`).then(r => r.data.data),
};
