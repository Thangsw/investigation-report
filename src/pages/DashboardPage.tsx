import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import type { Report, Investigator } from '../types';
import StatsCards from '../components/StatsCards';
import FilterBar from '../components/FilterBar';
import ReportList from '../components/ReportList';
import ExportButton from '../components/ExportButton';

interface Filters {
  dtvName: string;
  loaiHoSo: string;
  doi: string;
}

export default function DashboardPage() {
  const [reports, setReports]           = useState<Report[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [filters, setFilters]           = useState<Filters>({ dtvName: '', loaiHoSo: '', doi: '' });

  const fetchAll = useCallback(async () => {
    const [r, d] = await Promise.all([api.getReports(), api.getInvestigators()]);
    setReports(r);
    setInvestigators(d);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const changeFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (filters.dtvName  && r.dtvName  !== filters.dtvName)  return false;
      if (filters.loaiHoSo && r.loaiHoSo !== filters.loaiHoSo) return false;
      if (filters.doi      && r.doi      !== filters.doi)      return false;
      return true;
    });
  }, [reports, filters]);

  return (
    <div>
      {/* Section: Overview */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <span className="section-title">Tổng quan</span>
        <ExportButton />
      </div>

      <StatsCards reports={reports} />

      {/* Section: Danh sách */}
      <div className="section-header">
        <span className="section-title">
          Danh sách hồ sơ ({filteredReports.length})
        </span>
      </div>

      <FilterBar
        investigators={investigators}
        filters={filters}
        onChange={changeFilter}
      />

      <ReportList reports={filteredReports} />
    </div>
  );
}
