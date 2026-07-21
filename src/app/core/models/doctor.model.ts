export enum DoctorTitle {
  DR = 'DR',
  PROF = 'PROF',
  ASSOC_PROF = 'ASSOC_PROF'
}

export enum SessionType {
  IN_CLINIC = 'IN_CLINIC',
  VIRTUAL = 'VIRTUAL',
  BOTH = 'BOTH'
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED',
  NO_SHOW = 'NO_SHOW'
}

export enum LanguageProficiency {
  NATIVE = 'NATIVE',
  FLUENT = 'FLUENT',
  INTERMEDIATE = 'INTERMEDIATE',
  BASIC = 'BASIC'
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  EMERGENCY = 'EMERGENCY',
  CONFERENCE = 'CONFERENCE'
}

export interface DoctorRequestDto {
  userId: string;
  mohRegistrationNumber: string;
  mohVerified: boolean;
  title: DoctorTitle;
  bioEn: string;
  bioAr: string;
  experienceYears: number;
  overallRating: number;
  reviewCount: number;
  consultationFeeSar: number;
  isActive: boolean;
}

export interface DoctorResponseDto {
  doctorId: string;
  userId: string;
  fullName: string;
  mohRegistrationNumber: string;
  mohVerified: boolean;
  title: DoctorTitle;
  bioEn: string;
  bioAr: string;
  experienceYears: number;
  overallRating: number;
  reviewCount: number;
  consultationFeeSar: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorClinicRequestDto {
  doctorId: string;
  clinicId: string;
  branchId: string;
  department: string;
  consultationFeeSar: number;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export interface DoctorClinicResponseDto {
  dcId: string;
  doctorId: string;
  clinicId: string;
  branchId: string;
  department: string;
  consultationFeeSar: number;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  clinicNameEn?: string; // Appended by frontend
  branchNameEn?: string; // Appended by frontend
}

export interface DoctorLanguageRequestDto {
  doctorId: string;
  languageId: string;
  proficiency: LanguageProficiency;
}

export interface DoctorLanguageResponseDto {
  id: string;
  doctorId: string;
  languageId: string;
  proficiency: LanguageProficiency;
}

export interface DoctorSpecialtyRequestDto {
  doctorId: string;
  specialtyId: string;
  subSpecialtyId?: string;
  isPrimary: boolean;
}

export interface DoctorSpecialtyResponseDto {
  id: string;
  doctorId: string;
  specialtyId: string;
  subSpecialtyId?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface DoctorQualificationRequestDto {
  doctorId: string;
  degree: string;
  institution: string;
  country: string;
  yearObtained: number;
  sortOrder: number;
}

export interface DoctorQualificationResponseDto {
  qualId: string;
  doctorId: string;
  degree: string;
  institution: string;
  country: string;
  yearObtained: number;
  sortOrder: number;
  createdAt: string;
}

export interface DoctorScheduleRequestDto {
  dcId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  maxPatients: number;
  sessionType: SessionType;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
}

export interface DoctorScheduleResponseDto {
  scheduleId: string;
  dcId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  maxPatients: number;
  sessionType: SessionType;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
}

export interface DoctorLeaveRequestDto {
  dcId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isApproved: boolean;
  notes?: string;
}

export interface DoctorLeaveResponseDto {
  leaveId: string;
  dcId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isApproved: boolean;
  notes?: string;
  createdAt: string;
}

export interface AppointmentSlotRequestDto {
  dcId: string;
  scheduleId?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  status: SlotStatus;
  appointmentId?: string;
}

export interface AppointmentSlotResponseDto {
  slotId: string;
  dcId: string;
  scheduleId?: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  status: SlotStatus;
  appointmentId?: string;
  createdAt: string;
}

export interface DoctorDetailResponse extends DoctorResponseDto {
  clinics: DoctorClinicResponseDto[];
  specialties: DoctorSpecialtyResponseDto[];
  languages: DoctorLanguageResponseDto[];
  qualifications: DoctorQualificationResponseDto[];
}
