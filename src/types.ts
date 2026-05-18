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
  totalCaseTargetHB: number;
  totalCaseTargetLT: number;
  akTarget: number;
  adTarget: number;
  statsToBanDia: '' | 'Hoà Bình' | 'Lạc Thuỷ';
  sheetsViewUrl: string;
  requiredFields: RequiredFields;
}

export type ReportFormData = Omit<Report, 'id' | 'createdAt' | 'updatedAt'>;

export interface PendingChange {
  id: string;
  type: 'edit' | 'delete';
  reportId: string;
  reportSnapshot: Report;
  newData?: Partial<ReportFormData>;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export type WorkPosition = 'tham_muu_tong_hop' | 'doi_nghiep_vu';

export interface WorkProgressItem {
  id: string;
  category: string;
  workContent: string;
  quantity: string;
  summary: string;
  caseNumber: string;
  progress: string;
  deadline: string;
  difficulties: string;
  proposal: string;
}

export interface WorkProgressReport {
  id: string;
  officerName: string;
  team: string;
  positions: WorkPosition[];
  items: WorkProgressItem[];
  createdAt: string;
  updatedAt: string;
}

export type WorkProgressFormData = Omit<WorkProgressReport, 'id' | 'createdAt' | 'updatedAt'>;
