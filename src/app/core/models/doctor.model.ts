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

export type DoctorRequestDto = any;
export type DoctorResponseDto = any;
export type DoctorClinicRequestDto = any;
export type DoctorClinicResponseDto = any;
export type DoctorLanguageRequestDto = any;
export type DoctorLanguageResponseDto = any;
export type DoctorSpecialtyRequestDto = any;
export type DoctorSpecialtyResponseDto = any;
export type DoctorQualificationRequestDto = any;
export type DoctorQualificationResponseDto = any;
export type DoctorScheduleRequestDto = any;
export type DoctorScheduleResponseDto = any;
export type DoctorLeaveRequestDto = any;
export type DoctorLeaveResponseDto = any;
export type AppointmentSlotRequestDto = any;
export type AppointmentSlotResponseDto = any;
export type DoctorDetailResponse = any;
