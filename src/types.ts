export interface Report {
  id: string;
  dtvName: string;
  nguoiCamHoSo: string;
  loaiHoSo: 'AK' | 'AD';
  soTap: string;
  soHoSo: string;
  soLuu: string;
  qdPhanCongPTT: string;
  qdPhanCongLaiDTV: string;
  qdKhoiTo: string;
  hoSoHienHanh: boolean;
  trichYeu: string;
  doi: 'Đội 2' | 'Đội 3' | 'Đội 4';
  toBanDia: 'Hoà Bình' | 'Lạc Thuỷ';
  tinhTrang: string;
  ketQuaGiaiQuyet: string;
  ngayHetThoiHieuTruyCuuTNHS: string; // YYYY-MM-DD
  daThucHien: boolean;
  tinhChatMucDoNghiemTrong: string;
  khoKhan: string;
  createdAt: string;
  updatedAt: string;
}

export interface Investigator {
  id: string;
  name: string;
}

export interface RequiredFields {
  soHoSo: boolean;
  toBanDia: boolean;
  ngayHetThoiHieuTruyCuuTNHS: boolean;
  tinhChatMucDoNghiemTrong: boolean;
  trichYeu: boolean;
  qdPhanCongPTT: boolean;
  qdPhanCongLaiDTV: boolean;
  qdKhoiTo: boolean;
  tinhTrang: boolean;
  ketQuaGiaiQuyet: boolean;
  khoKhan: boolean;
}

export interface AppConfig {
  totalCaseTarget: number;
  akTarget: number;
  adTarget: number;
  statsToBanDia: '' | 'Hoà Bình' | 'Lạc Thuỷ';
  sheetsViewUrl: string;
  requiredFields: RequiredFields;
}

export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;
