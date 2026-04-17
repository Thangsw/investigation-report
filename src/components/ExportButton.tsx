import { Download } from 'lucide-react';
import { api } from '../api';

export default function ExportButton() {
  return (
    <button className="btn-export" onClick={api.exportExcel}>
      <Download size={16} />
      Xuất Excel
    </button>
  );
}
