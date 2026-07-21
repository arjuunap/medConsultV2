export enum CasePriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

export enum CaseRoomStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED'
}

export enum CaseRoomRole {
  OWNER = 'OWNER',
  MODERATOR = 'MODERATOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
  VIEWER = 'VIEWER'
}

export enum PostType {
  NOTE = 'NOTE',
  ACTION_ITEM = 'ACTION_ITEM',
  FILE = 'FILE',
  SYSTEM_EVENT = 'SYSTEM_EVENT'
}

export enum ActionStatus {
  NONE = 'NONE',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED'
}

export interface CaseRoomRequestDto {
  patientId: string;
  title: string;
  description?: string;
  priority: CasePriority;
}

export interface CaseRoomResponseDto {
  caseRoomId: string;
  patientId: string;
  patientName: string; 
  openedById: string;
  openedByName: string;
  title: string;
  description: string;
  status: CaseRoomStatus;
  priority: CasePriority;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRoomSearchRequest {
  title?: string;
  specialty?: string;
  status?: CaseRoomStatus;
  page?: number;
  size?: number;
}

export interface UpdateCaseRoomStatusRequest {
  status: CaseRoomStatus;
  resolutionSummary?: string;
}

// Members
export interface CaseRoomMemberRequestDto {
  caseRoomId: string;
  doctorId: string;
  role: CaseRoomRole;
}

export interface CaseRoomMemberResponseDto {
  memberId: string;
  caseRoomId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  role: CaseRoomRole;
  joinedAt: string;
  isActive: boolean;
}

// Posts
export interface CaseRoomPostRequestDto {
  caseRoomId: string;
  postType: PostType;
  body: string;
  fileId?: string;
  actionAssignedTo?: string;
  actionDueDate?: string;
  tags?: string;
}

export interface CaseRoomPostResponseDto {
  postId: string;
  caseRoomId: string;
  authorId: string;
  authorName: string;
  postType: PostType;
  body: string;
  fileId?: string;
  actionAssignedTo?: string;
  actionAssignedToName?: string;
  actionDueDate?: string;
  actionStatus: ActionStatus;
  tags?: string;
  postedAt: string;
  editedAt?: string;
}

export interface UpdateCaseRoomPostActionRequest {
  actionStatus: ActionStatus;
}
