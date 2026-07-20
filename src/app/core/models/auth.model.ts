export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

export type UserLoginDto = any;
export type RegisterRequestDto = any;
export type AuthResponseDto = any;
export type UserResponseDto = any;
