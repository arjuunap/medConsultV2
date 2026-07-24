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

export interface UserResponseDto {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  preferredLang?: string;
  gender?: Gender;
  role: UserRole;
  managedClinics?: any[];
  managedClinicIds?: string[];
}

export type UserLoginDto = any;
export type RegisterRequestDto = any;
export type AuthResponseDto = {
  token: string;
  user?: UserResponseDto;
};
