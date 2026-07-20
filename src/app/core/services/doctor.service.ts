import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private http = inject(HttpClient);

  // ── Core Doctor CRUD ──────────────────────────────────────────────
  getAllDoctors(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/all`);
  }

  getDoctorProfile(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/profile/${id}`);
  }

  addDoctor(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/add`, dto);
  }

  updateDoctor(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/${id}/update`, dto);
  }

  deleteDoctor(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/${id}/delete`, { responseType: 'text' });
  }

  // ── Doctor-Clinic Links ─────────────────────────────────────────────
  getDoctorClinics(doctorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/clinics`);
  }

  addDoctorClinic(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/clinics/add`, dto);
  }

  updateDoctorClinic(dcId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/update`, dto);
  }

  removeDoctorClinic(dcId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/remove`, { responseType: 'text' });
  }

  // ── Specialties ─────────────────────────────────────────────────────
  getDoctorSpecialties(doctorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/specialties`);
  }

  addSpecialty(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/specialties/add`, dto);
  }

  updateSpecialty(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/specialties/${id}/update`, dto);
  }

  removeSpecialty(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/specialties/${id}/remove`, { responseType: 'text' });
  }

  // ── Languages ───────────────────────────────────────────────────────
  getDoctorLanguages(doctorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/languages`);
  }

  addLanguage(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/languages/add`, dto);
  }

  removeLanguage(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/languages/${id}/remove`, { responseType: 'text' });
  }

  // ── Qualifications ──────────────────────────────────────────────────
  getDoctorQualifications(doctorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/${doctorId}/qualifications`);
  }

  addQualification(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/qualifications/add`, dto);
  }

  updateQualification(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/qualifications/${id}/update`, dto);
  }

  removeQualification(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/qualifications/${id}/remove`, { responseType: 'text' });
  }

  // ── Schedules ───────────────────────────────────────────────────────
  getDcSchedules(dcId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/schedules`);
  }

  addSchedule(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/schedules/add`, dto);
  }

  updateSchedule(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/schedules/${id}/update`, dto);
  }

  removeSchedule(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/schedules/${id}/remove`, { responseType: 'text' });
  }

  // ── Leave ───────────────────────────────────────────────────────────
  getDcLeave(dcId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/leave`);
  }

  addLeave(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/leave/add`, dto);
  }

  updateLeave(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/leave/${id}/update`, dto);
  }

  removeLeave(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/leave/${id}/remove`, { responseType: 'text' });
  }

  // ── Slots ───────────────────────────────────────────────────────────
  getAvailableSlots(dcId: string, date?: string): Observable<any> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date); // date: "YYYY-MM-DD"
    }
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/doctors/clinics/${dcId}/slots`, { params });
  }

  addSlot(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/doctors/slots/add`, dto);
  }

  updateSlot(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/doctors/slots/${id}/update`, dto);
  }

  removeSlot(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/doctors/slots/${id}/remove`, { responseType: 'text' });
  }
}
