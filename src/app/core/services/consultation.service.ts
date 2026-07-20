import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ConsultationRequestDto, 
  ConsultationResponseDto, 
  ConsultationSearchRequest, 
  UpdateConsultationStatusRequest,
  ConsultationMessageRequestDto,
  ConsultationMessageResponseDto
} from '../models/consultation.model';
import { Page } from '../models/common.model';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/medconsult/consultations`;

  // --- Consultations ---

  openConsultation(dto: ConsultationRequestDto): Observable<ConsultationResponseDto> {
    return this.http.post<ConsultationResponseDto>(`${this.apiUrl}/book`, dto);
  }

  getConsultationById(id: string): Observable<ConsultationResponseDto> {
    return this.http.get<ConsultationResponseDto>(`${this.apiUrl}/${id}`);
  }

  searchConsultations(searchRequest: ConsultationSearchRequest): Observable<Page<ConsultationResponseDto>> {
    return this.http.post<Page<ConsultationResponseDto>>(`${this.apiUrl}/search`, searchRequest);
  }

  updateStatus(id: string, statusRequest: UpdateConsultationStatusRequest): Observable<ConsultationResponseDto> {
    return this.http.patch<ConsultationResponseDto>(`${this.apiUrl}/${id}/status`, statusRequest);
  }

  getConsultationsByPatient(patientId: string, page: number = 0, size: number = 10): Observable<Page<ConsultationResponseDto>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<ConsultationResponseDto>>(`${this.apiUrl}/patient/${patientId}`, { params });
  }

  getConsultationsByDoctor(doctorId: string, page: number = 0, size: number = 10): Observable<Page<ConsultationResponseDto>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<ConsultationResponseDto>>(`${this.apiUrl}/doctor/${doctorId}`, { params });
  }

  // --- Messages ---

  sendMessage(dto: ConsultationMessageRequestDto): Observable<ConsultationMessageResponseDto> {
    return this.http.post<ConsultationMessageResponseDto>(`${this.apiUrl}/messages/`, dto);
  }

  getMessagesForConsultation(consultationId: string): Observable<ConsultationMessageResponseDto[]> {
    return this.http.get<ConsultationMessageResponseDto[]>(`${this.apiUrl}/messages/consultation/${consultationId}`);
  }

  markMessageAsRead(messageId: string): Observable<ConsultationMessageResponseDto> {
    return this.http.patch<ConsultationMessageResponseDto>(`${this.apiUrl}/messages/${messageId}/read`, {});
  }
}
