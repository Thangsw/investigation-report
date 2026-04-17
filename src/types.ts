export interface Report {
  id: string;
  dtvName: string;
  nguoiCamHoSo: string;
  loaiHoSo: 'AK' | 'AD';
  soTap: string;
  soHoSo: string;
  soLuu: string;
  trichYeu: string;
  doi: 'Đội 2' | 'Đội 3' | 'Đội 4';
  tinhTrang: string;
  thoiHanDinhChi: string; // YYYY-MM-DD
  khoKhan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investigator {
  id: string;
  name: string;
}

export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;
