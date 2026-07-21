import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CaseRoomRequestDto, 
  CaseRoomResponseDto, 
  CaseRoomSearchRequest, 
  UpdateCaseRoomStatusRequest,
  CaseRoomMemberRequestDto,
  CaseRoomMemberResponseDto,
  CaseRoomPostRequestDto,
  CaseRoomPostResponseDto,
  UpdateCaseRoomPostActionRequest
} from '../models/caseroom.model';

@Injectable({
  providedIn: 'root'
})
export class CaseRoomService {

  constructor(private http: HttpClient) { }

  // --- Case Rooms ---

  openCaseRoom(dto: CaseRoomRequestDto): Observable<CaseRoomResponseDto> {
    return this.http.post<CaseRoomResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/`, dto);
  }

  getCaseRoomById(id: string): Observable<CaseRoomResponseDto> {
    return this.http.get<CaseRoomResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/${id}`);
  }

  searchCaseRooms(request: CaseRoomSearchRequest): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/caserooms/search`, request);
  }

  updateStatus(id: string, request: UpdateCaseRoomStatusRequest): Observable<CaseRoomResponseDto> {
    return this.http.patch<CaseRoomResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/${id}/status`, request);
  }

  // --- Members ---

  addMember(dto: CaseRoomMemberRequestDto): Observable<CaseRoomMemberResponseDto> {
    return this.http.post<CaseRoomMemberResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/members/`, dto);
  }

  getMembersForRoom(caseRoomId: string): Observable<CaseRoomMemberResponseDto[]> {
    return this.http.get<CaseRoomMemberResponseDto[]>(`${environment.apiUrl}/api/medconsult/caserooms/members/room/${caseRoomId}`);
  }

  removeMember(memberId: string): Observable<CaseRoomMemberResponseDto> {
    return this.http.delete<CaseRoomMemberResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/members/${memberId}`);
  }

  getMyCaseRooms(): Observable<CaseRoomMemberResponseDto[]> {
    return this.http.get<CaseRoomMemberResponseDto[]>(`${environment.apiUrl}/api/medconsult/caserooms/members/my-rooms`);
  }

  // --- Posts ---

  createPost(dto: CaseRoomPostRequestDto): Observable<CaseRoomPostResponseDto> {
    return this.http.post<CaseRoomPostResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/posts/`, dto);
  }

  getPostsForRoom(caseRoomId: string, page = 0, size = 50): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/caserooms/posts/room/${caseRoomId}`, { params });
  }

  updateActionStatus(postId: string, request: UpdateCaseRoomPostActionRequest): Observable<CaseRoomPostResponseDto> {
    return this.http.patch<CaseRoomPostResponseDto>(`${environment.apiUrl}/api/medconsult/caserooms/posts/${postId}/action-status`, request);
  }
}
