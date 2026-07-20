export enum ConsultationStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_RESULT = 'LAB_RESULT',
  SYSTEM_EVENT = 'SYSTEM_EVENT'
}

export interface ConsultationRequestDto {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  subject?: string;
  isUrgent?: boolean;
}

export interface ConsultationResponseDto {
  consultationId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentId?: string;
  subject?: string;
  status: ConsultationStatus;
  isUrgent: boolean;
  openedAt: string;
  closedAt?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface ConsultationMessageRequestDto {
  consultationId: string;
  messageType: MessageType;
  body?: string;
  fileId?: string;
  prescriptionId?: string;
  labResultId?: string;
  isUrgent?: boolean;
}

export interface ConsultationMessageResponseDto {
  messageId: string;
  consultationId: string;
  senderId: string;
  senderName: string;
  messageType: MessageType;
  body?: string;
  fileId?: string;
  prescriptionId?: string;
  labResultId?: string;
  isRead: boolean;
  readAt?: string;
  isUrgent: boolean;
  sentAt: string;
  deletedAt?: string;
}

export interface ConsultationSearchRequest {
  patientId?: string;
  doctorId?: string;
  status?: ConsultationStatus;
  isUrgent?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface UpdateConsultationStatusRequest {
  status: ConsultationStatus;
}
