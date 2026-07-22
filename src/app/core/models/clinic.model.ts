export interface ClinicRequestDto {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phonePrimary: string;
  phoneSecondary?: string;
  mohLicenseNumber?: string;
  vatNumber?: string;
  isActive?: boolean;
}

export interface ClinicResponseDto {
  clinicId: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  logoUrl: string;
  website: string;
  email: string;
  phonePrimary: string;
  phoneSecondary: string;
  mohLicenseNumber: string;
  vatNumber?: string;
  mohVerified: boolean;
  mohVerifiedAt: string;
  naphiesFacilityId: string;
  isActive: boolean;
  overallRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicBranchRequestDto {
  branchNameEn: string;
  branchNameAr: string;
  cityId: string;
  localityId?: string;
  addressLine1: string;
  addressLine2?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  isActive?: boolean;
}

export interface ClinicBranchResponseDto {
  branchId: string;
  clinicId: string;
  branchNameEn: string;
  branchNameAr: string;
  cityId: string;
  localityId: string;
  addressLine1: string;
  addressLine2: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ClinicOperatingHourRequestDto {
  branchId: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
  notes?: string;
}

export interface ClinicOperatingHourResponseDto {
  hoursId: string;
  branchId: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
  notes: string;
}

export interface ClinicSpecialtyResponseDto {
  id: string;
  clinicId: string;
  specialtyId: string;
  createdAt: string;
}

export interface ClinicLanguageResponseDto {
  id: string;
  clinicId: string;
  languageId: string;
}

export interface ClinicInsuranceRequestDto {
  providerId: string;
  networkClass: string;
  isActive: boolean;
}

export interface ClinicInsuranceResponseDto {
  id: string;
  clinicId: string;
  providerId: string;
  networkClass: string;
  isActive: boolean;
  createdAt: string;
}

export interface ClinicDetailResponse extends ClinicResponseDto {
  branches: ClinicBranchResponseDto[];
  specialties: ClinicSpecialtyResponseDto[];
  insurances: ClinicInsuranceResponseDto[];
  languages: ClinicLanguageResponseDto[];
}

