export interface Report {
  id: string;
  dtvName: string;
  nguoiCamHoSo: string;
  loaiHoSo: 'AK' | 'AD';
  soTap: string;
  soHoSo: string;
  soLuu: string;
  hoSoHienHanh: boolean;
  trichYeu: string;
  doi: 'Đội 2' | 'Đội 3' | 'Đội 4';
  toBanDia: 'Hoà Bình' | 'Lạc Thuỷ';
  tinhTrang: string;
  ketQuaGiaiQuyet: string;
  ngayHetThoiHieuTruyCuuTNHS: string; // YYYY-MM-DD
  tinhChatMucDoNghiemTrong: string;
  khoKhan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investigator {
  id: string;
  name: string;
}

export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;
