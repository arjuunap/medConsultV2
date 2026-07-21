import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ConsultationRequestDto, 
  ConsultationResponseDto, 
  ConsultationMessageRequestDto, 
  ConsultationMessageResponseDto,
  UpdateConsultationStatusRequest 
} from '../models/consultation.model';

@Injectable({
  providedIn: 'root'
})
export class ConsultationService {

  constructor(private http: HttpClient) { }

  // --- Consultations ---
  
  bookConsultation(dto: ConsultationRequestDto): Observable<ConsultationResponseDto> {
    return this.http.post<ConsultationResponseDto>(`${environment.apiUrl}/api/medconsult/consultations/book`, dto);
  }

  getConsultationById(id: string): Observable<ConsultationResponseDto> {
    return this.http.get<ConsultationResponseDto>(`${environment.apiUrl}/api/medconsult/consultations/${id}`);
  }

  updateStatus(id: string, dto: UpdateConsultationStatusRequest): Observable<ConsultationResponseDto> {
    return this.http.patch<ConsultationResponseDto>(`${environment.apiUrl}/api/medconsult/consultations/${id}/status`, dto);
  }

  getConsultationsByPatient(patientId: string, page = 0, size = 10): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/consultations/patient/${patientId}`, { params });
  }

  getConsultationsByDoctor(doctorId: string, page = 0, size = 10): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/consultations/doctor/${doctorId}`, { params });
  }

  // --- Consultation Messages ---

  sendMessage(dto: ConsultationMessageRequestDto): Observable<ConsultationMessageResponseDto> {
    return this.http.post<ConsultationMessageResponseDto>(`${environment.apiUrl}/api/medconsult/consultations/messages/`, dto);
  }

  getMessagesForConsultation(consultationId: string): Observable<ConsultationMessageResponseDto[]> {
    return this.http.get<ConsultationMessageResponseDto[]>(`${environment.apiUrl}/api/medconsult/consultations/messages/consultation/${consultationId}`);
  }

  markAsRead(messageId: string): Observable<ConsultationMessageResponseDto> {
    return this.http.patch<ConsultationMessageResponseDto>(`${environment.apiUrl}/api/medconsult/consultations/messages/${messageId}/read`, {});
  }
}
