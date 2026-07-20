export enum CaseRoomStatus {
  ACTIVE = 'ACTIVE',
  PENDING_REVIEW = 'PENDING_REVIEW',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED'
}

export enum CasePriority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL'
}

export enum PostType {
  NOTE = 'NOTE',
  ACTION_ITEM = 'ACTION_ITEM',
  FILE = 'FILE',
  SYSTEM_EVENT = 'SYSTEM_EVENT'
}

export enum ActionStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
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
  description?: string;
  status: CaseRoomStatus;
  priority: CasePriority;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseRoomPostRequestDto {
  caseRoomId: string;
  postType: PostType;
  body?: string;
  fileId?: string;
  actionAssignedTo?: string;
  actionDueDate?: string; // YYYY-MM-DD format from LocalDate
  tags?: string;
}

export interface CaseRoomPostResponseDto {
  postId: string;
  caseRoomId: string;
  authorId: string;
  authorName: string;
  postType: PostType;
  body?: string;
  fileId?: string;
  actionAssignedTo?: string;
  actionAssignedToName?: string;
  actionDueDate?: string;
  actionStatus?: ActionStatus;
  tags?: string;
  postedAt: string;
  editedAt?: string;
}

export interface CaseRoomSearchRequest {
  patientId?: string;
  openedById?: string;
  status?: CaseRoomStatus;
  priority?: CasePriority;
  searchTerm?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface UpdateCaseRoomStatusRequest {
  status: CaseRoomStatus;
}

export interface UpdateCaseRoomPostActionRequest {
  actionStatus: ActionStatus;
}
