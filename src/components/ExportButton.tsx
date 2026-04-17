import { Download } from 'lucide-react';
import { api } from '../api';
import type { Filters } from './FilterBar';

interface Props {
  filters?: Partial<Filters>;
  label?: string;
}

export default function ExportButton({ filters, label = 'Xuất Excel' }: Props) {
  return (
    <button className="btn-export" onClick={() => api.exportExcel(filters)}>
      <Download size={16} />
      {label}
    </button>
  );
}
