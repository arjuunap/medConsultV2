import { SessionType } from './doctor.model';
export { SessionType };

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export enum AppointmentType {
  FOLLOW_UP = 'FOLLOW_UP',
  NEW_PATIENT = 'NEW_PATIENT',
  REFERRAL = 'REFERRAL',
  EMERGENCY = 'EMERGENCY'
}

export type AppointmentRequestDto = any;
export type AppointmentResponseDto = any;
export type AppointmentSearchRequest = any;
export type CancelAppointmentRequest = any;
export type UpdateAppointmentStatusRequest = any;
