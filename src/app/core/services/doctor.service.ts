import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DoctorRequestDto,
  DoctorResponseDto,
  DoctorDetailResponse,
  DoctorClinicRequestDto,
  DoctorClinicResponseDto,
  DoctorSpecialtyRequestDto,
  DoctorSpecialtyResponseDto,
  DoctorLanguageRequestDto,
  DoctorLanguageResponseDto,
  DoctorQualificationRequestDto,
  DoctorQualificationResponseDto,
  DoctorScheduleRequestDto,
  DoctorScheduleResponseDto,
  DoctorLeaveRequestDto,
  DoctorLeaveResponseDto,
  AppointmentSlotRequestDto,
  AppointmentSlotResponseDto
} from '../models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private http = inject(HttpClient);

  // ── Core Doctor CRUD ──────────────────────────────────────────────
  getAllDoctors(): Observable<DoctorResponseDto[]> {
    return this.http.get<DoctorResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/all`);
  }

  getDoctorProfile(id: string): Observable<DoctorDetailResponse> {
    return this.http.get<DoctorDetailResponse>(`${environment.apiUrl}/api/medconsult/doctors/profile/${id}`);
  }

  addDoctor(dto: DoctorRequestDto): Observable<DoctorResponseDto> {
    return this.http.post<DoctorResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/add`, dto);
  }

  updateDoctor(id: string, dto: Partial<DoctorRequestDto>): Observable<DoctorResponseDto> {
    return this.http.patch<DoctorResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/${id}/update`, dto);
  }

  deleteDoctor(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/${id}/delete`, { responseType: 'text' });
  }

  // ── Doctor-Clinic Links ─────────────────────────────────────────────
  getDoctorClinics(doctorId: string): Observable<DoctorClinicResponseDto[]> {
    return this.http.get<DoctorClinicResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/clinics`);
  }

  addDoctorClinic(dto: DoctorClinicRequestDto): Observable<DoctorClinicResponseDto> {
    return this.http.post<DoctorClinicResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/clinics/add`, dto);
  }

  updateDoctorClinic(dcId: string, dto: Partial<DoctorClinicRequestDto>): Observable<DoctorClinicResponseDto> {
    return this.http.patch<DoctorClinicResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/update`, dto);
  }

  removeDoctorClinic(dcId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/remove`, { responseType: 'text' });
  }

  // ── Specialties ─────────────────────────────────────────────────────
  getDoctorSpecialties(doctorId: string): Observable<DoctorSpecialtyResponseDto[]> {
    return this.http.get<DoctorSpecialtyResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/specialties`);
  }

  addSpecialty(dto: DoctorSpecialtyRequestDto): Observable<DoctorSpecialtyResponseDto> {
    return this.http.post<DoctorSpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/specialties/add`, dto);
  }

  updateSpecialty(id: string, dto: Partial<DoctorSpecialtyRequestDto>): Observable<DoctorSpecialtyResponseDto> {
    return this.http.patch<DoctorSpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/specialties/${id}/update`, dto);
  }

  removeSpecialty(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/specialties/${id}/remove`, { responseType: 'text' });
  }

  // ── Languages ───────────────────────────────────────────────────────
  getDoctorLanguages(doctorId: string): Observable<DoctorLanguageResponseDto[]> {
    return this.http.get<DoctorLanguageResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/languages`);
  }

  addLanguage(dto: DoctorLanguageRequestDto): Observable<DoctorLanguageResponseDto> {
    return this.http.post<DoctorLanguageResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/languages/add`, dto);
  }

  removeLanguage(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/languages/${id}/remove`, { responseType: 'text' });
  }

  // ── Qualifications ──────────────────────────────────────────────────
  getDoctorQualifications(doctorId: string): Observable<DoctorQualificationResponseDto[]> {
    return this.http.get<DoctorQualificationResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/qualifications`);
  }

  addQualification(dto: DoctorQualificationRequestDto): Observable<DoctorQualificationResponseDto> {
    return this.http.post<DoctorQualificationResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/qualifications/add`, dto);
  }

  updateQualification(id: string, dto: Partial<DoctorQualificationRequestDto>): Observable<DoctorQualificationResponseDto> {
    return this.http.patch<DoctorQualificationResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/qualifications/${id}/update`, dto);
  }

  removeQualification(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/qualifications/${id}/remove`, { responseType: 'text' });
  }

  // ── Schedules ───────────────────────────────────────────────────────
  getDcSchedules(dcId: string): Observable<DoctorScheduleResponseDto[]> {
    return this.http.get<DoctorScheduleResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/schedules`);
  }

  addSchedule(dto: DoctorScheduleRequestDto): Observable<DoctorScheduleResponseDto> {
    return this.http.post<DoctorScheduleResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/schedules/add`, dto);
  }

  updateSchedule(id: string, dto: Partial<DoctorScheduleRequestDto>): Observable<DoctorScheduleResponseDto> {
    return this.http.patch<DoctorScheduleResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/schedules/${id}/update`, dto);
  }

  removeSchedule(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/schedules/${id}/remove`, { responseType: 'text' });
  }

  // ── Leave ───────────────────────────────────────────────────────────
  getDcLeave(dcId: string): Observable<DoctorLeaveResponseDto[]> {
    return this.http.get<DoctorLeaveResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/leave`);
  }

  addLeave(dto: DoctorLeaveRequestDto): Observable<DoctorLeaveResponseDto> {
    return this.http.post<DoctorLeaveResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/leave/add`, dto);
  }

  updateLeave(id: string, dto: Partial<DoctorLeaveRequestDto>): Observable<DoctorLeaveResponseDto> {
    return this.http.patch<DoctorLeaveResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/leave/${id}/update`, dto);
  }

  removeLeave(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/leave/${id}/remove`, { responseType: 'text' });
  }

  // ── Slots ───────────────────────────────────────────────────────────
  getAvailableSlots(dcId: string, date?: string): Observable<AppointmentSlotResponseDto[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date); // date: "YYYY-MM-DD"
    }
    return this.http.get<AppointmentSlotResponseDto[]>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/slots`, { params });
  }

  addSlot(dto: AppointmentSlotRequestDto): Observable<AppointmentSlotResponseDto> {
    return this.http.post<AppointmentSlotResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/slots/add`, dto);
  }

  updateSlot(id: string, dto: Partial<AppointmentSlotRequestDto>): Observable<AppointmentSlotResponseDto> {
    return this.http.patch<AppointmentSlotResponseDto>(`${environment.apiUrl}/api/medconsult/doctors/slots/${id}/update`, dto);
  }

  removeSlot(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/slots/${id}/remove`, { responseType: 'text' });
  }
}
