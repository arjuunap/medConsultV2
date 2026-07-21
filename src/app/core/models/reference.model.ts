export interface CityRequestDto {
  countryCode: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CityResponseDto {
  cityId: string;
  countryCode: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface LocalityRequestDto {
  cityId: string;
  nameEn: string;
  nameAr: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
}

export interface LocalityResponseDto {
  localityId: string;
  cityId: string;
  nameEn: string;
  nameAr: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
}

export interface SpecialtyRequestDto {
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  iconSlug: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SpecialtyResponseDto {
  specialtyId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  category: string;
  iconSlug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface SubSpecialtyRequestDto {
  specialtyId: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}

export interface SubSpecialtyResponseDto {
  subSpecialtyId: string;
  specialtyId: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
  createdAt: string;
}

export interface LanguageRequestDto {
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}

export interface LanguageResponseDto {
  languageId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  isActive: boolean;
}

export interface InsuranceProviderRequestDto {
  nameEn: string;
  nameAr: string;
  logoUrl: string;
  isActive: boolean;
}

export interface InsuranceProviderResponseDto {
  providerId: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string;
  isActive: boolean;
  createdAt: string;
}

