import type { Report } from './types';

export const DEFAULT_TOTAL_CASE_TARGET = 610;
export const DEADLINE_WARNING_DAYS = 30;

export type DeadlineStatus = 'none' | 'upcoming' | 'overdue';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDeadline(dateStr: string): Date | null {
  if (!dateStr) return null;

  const deadline = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return null;

  return deadline;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function getDaysUntilDeadline(dateStr: string, today = startOfToday()): number | null {
  const deadline = parseDeadline(dateStr);
  if (!deadline) return null;

  return Math.round((deadline.getTime() - today.getTime()) / MS_PER_DAY);
}

export function getDeadlineStatus(dateStr: string, today = startOfToday()): DeadlineStatus {
  const daysUntilDeadline = getDaysUntilDeadline(dateStr, today);
  if (daysUntilDeadline === null) return 'none';
  if (daysUntilDeadline < 0) return 'overdue';
  if (daysUntilDeadline <= DEADLINE_WARNING_DAYS) return 'upcoming';
  return 'none';
}

export function isReassignedReport(report: Report) {
  return normalizeText(report.tinhTrang).includes('phan cong lai');
}

export function hasDifficulty(report: Report) {
  return (report.khoKhan ?? '').trim().length > 0;
}

export function getDashboardMetrics(reports: Report[], totalCaseTarget = DEFAULT_TOTAL_CASE_TARGET) {
  const today = startOfToday();

  const akCount = reports.filter((report) => report.loaiHoSo === 'AK').length;
  const adCount = reports.filter((report) => report.loaiHoSo === 'AD').length;
  const completedCount = reports.length;
  const remainingToReport = Math.max(totalCaseTarget - completedCount, 0);
  const completionRate = totalCaseTarget > 0
    ? (completedCount / totalCaseTarget) * 100
    : 0;

  const reassignedCount = reports.filter(isReassignedReport).length;
  const difficultyCount = reports.filter(hasDifficulty).length;
  const upcomingDeadlineCount = reports.filter(
    (report) => !report.daThucHien && getDeadlineStatus(report.ngayHetThoiHieuTruyCuuTNHS, today) === 'upcoming',
  ).length;
  const overdueDeadlineCount = reports.filter(
    (report) => !report.daThucHien && getDeadlineStatus(report.ngayHetThoiHieuTruyCuuTNHS, today) === 'overdue',
  ).length;

  const byDTV: Record<string, number> = {};
  reports.forEach((report) => {
    const dtvName = report.dtvName || 'Chưa rõ ĐTV';
    byDTV[dtvName] = (byDTV[dtvName] || 0) + 1;
  });

  const byDoi = {
    'Đội 2': reports.filter((report) => report.doi === 'Đội 2').length,
    'Đội 3': reports.filter((report) => report.doi === 'Đội 3').length,
    'Đội 4': reports.filter((report) => report.doi === 'Đội 4').length,
  };

  return {
    akCount,
    adCount,
    byDTV,
    byDoi,
    completedCount,
    completionRate,
    difficultyCount,
    overdueDeadlineCount,
    reassignedCount,
    remainingToReport,
    upcomingDeadlineCount,
  };
}
