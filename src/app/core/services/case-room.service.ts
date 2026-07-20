import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CaseRoomRequestDto, 
  CaseRoomResponseDto, 
  CaseRoomSearchRequest, 
  UpdateCaseRoomStatusRequest,
  CaseRoomPostRequestDto,
  CaseRoomPostResponseDto,
  UpdateCaseRoomPostActionRequest
} from '../models/case-room.model';
import { Page } from '../models/common.model';

@Injectable({
  providedIn: 'root'
})
export class CaseRoomService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/medconsult/caserooms`;

  // --- Case Rooms ---

  openCaseRoom(dto: CaseRoomRequestDto): Observable<CaseRoomResponseDto> {
    return this.http.post<CaseRoomResponseDto>(`${this.apiUrl}/`, dto);
  }

  getCaseRoomById(id: string): Observable<CaseRoomResponseDto> {
    return this.http.get<CaseRoomResponseDto>(`${this.apiUrl}/${id}`);
  }

  searchCaseRooms(searchRequest: CaseRoomSearchRequest): Observable<Page<CaseRoomResponseDto>> {
    return this.http.post<Page<CaseRoomResponseDto>>(`${this.apiUrl}/search`, searchRequest);
  }

  updateStatus(id: string, statusRequest: UpdateCaseRoomStatusRequest): Observable<CaseRoomResponseDto> {
    return this.http.patch<CaseRoomResponseDto>(`${this.apiUrl}/${id}/status`, statusRequest);
  }

  // --- Posts ---

  createPost(dto: CaseRoomPostRequestDto): Observable<CaseRoomPostResponseDto> {
    return this.http.post<CaseRoomPostResponseDto>(`${this.apiUrl}/posts/`, dto);
  }

  getPostsForRoom(caseRoomId: string, page: number = 0, size: number = 10): Observable<Page<CaseRoomPostResponseDto>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<CaseRoomPostResponseDto>>(`${this.apiUrl}/posts/room/${caseRoomId}`, { params });
  }

  updatePostActionStatus(postId: string, statusRequest: UpdateCaseRoomPostActionRequest): Observable<CaseRoomPostResponseDto> {
    return this.http.patch<CaseRoomPostResponseDto>(`${this.apiUrl}/posts/${postId}/action-status`, statusRequest);
  }
}
