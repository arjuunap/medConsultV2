export enum BloodType {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
  Unknown = 'Unknown'
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED'
}

export enum SmokingStatus {
  NEVER = 'NEVER',
  FORMER = 'FORMER',
  CURRENT = 'CURRENT'
}

export enum AlcoholStatus {
  NONE = 'NONE',
  OCCASIONAL = 'OCCASIONAL',
  REGULAR = 'REGULAR'
}

export enum AllergyType {
  DRUG = 'DRUG',
  FOOD = 'FOOD',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  OTHER = 'OTHER'
}

export enum Severity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE'
}

export enum ConditionStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  IN_REMISSION = 'IN_REMISSION'
}

export type PatientRequestDto = any;
export type PatientResponseDto = any;
export type PatientHealthProfileRequestDto = any;
export type PatientHealthProfileResponseDto = any;
export type PatientAllergyRequestDto = any;
export type PatientAllergyResponseDto = any;
export type PatientChronicConditionRequestDto = any;
export type PatientChronicConditionResponseDto = any;
