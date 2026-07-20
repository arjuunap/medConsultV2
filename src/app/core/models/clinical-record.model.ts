export enum PrescriptionStatus {
  ACTIVE = 'ACTIVE',
  DISPENSED = 'DISPENSED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum VitalSource {
  PATIENT_APP = 'PATIENT_APP',
  DOCTOR_ENTRY = 'DOCTOR_ENTRY',
  DEVICE_SYNC = 'DEVICE_SYNC',
  NAPHIES = 'NAPHIES'
}

export enum LabResultStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  REVIEWED = 'REVIEWED',
  ABNORMAL = 'ABNORMAL',
  CRITICAL = 'CRITICAL'
}

export enum ResultFlag {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
  CRITICAL = 'CRITICAL'
}

export enum LabItemFlag {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  LOW = 'LOW',
  CRITICAL_HIGH = 'CRITICAL_HIGH',
  CRITICAL_LOW = 'CRITICAL_LOW',
  ABNORMAL = 'ABNORMAL'
}

export type PrescriptionRequestDto = any;
export type PrescriptionResponseDto = any;
export type PrescriptionItemRequestDto = any;
export type PrescriptionItemResponseDto = any;
export type VitalRequestDto = any;
export type VitalResponseDto = any;
export type LabResultRequestDto = any;
export type LabResultResponseDto = any;
export type LabItemRequestDto = any;
export type LabItemResponseDto = any;
export type MedicationAdherenceRequestDto = any;
export type MedicationAdherenceResponseDto = any;
