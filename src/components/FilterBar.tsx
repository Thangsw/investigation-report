import type { Investigator } from '../types';

interface Filters {
  dtvName: string;
  loaiHoSo: string;
  doi: string;
}

interface Props {
  investigators: Investigator[];
  filters: Filters;
  onChange: (key: keyof Filters, value: string) => void;
}

export default function FilterBar({ investigators, filters, onChange }: Props) {
  return (
    <div className="filter-bar">
      <select
        className="form-control"
        value={filters.dtvName}
        onChange={e => onChange('dtvName', e.target.value)}
      >
        <option value="">Tất cả ĐTV</option>
        {investigators.map(d => (
          <option key={d.id} value={d.name}>{d.name}</option>
        ))}
      </select>

      <select
        className="form-control"
        value={filters.loaiHoSo}
        onChange={e => onChange('loaiHoSo', e.target.value)}
      >
        <option value="">Tất cả loại</option>
        <option value="AK">AK</option>
        <option value="AD">AD</option>
      </select>

      <select
        className="form-control"
        value={filters.doi}
        onChange={e => onChange('doi', e.target.value)}
      >
        <option value="">Tất cả đội</option>
        <option value="Đội 2">Đội 2</option>
        <option value="Đội 3">Đội 3</option>
        <option value="Đội 4">Đội 4</option>
      </select>
    </div>
  );
}
