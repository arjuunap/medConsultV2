import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);

  bookAppointment(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/appointments/book`, dto);
  }

  getAppointmentById(appointmentId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/${appointmentId}`);
  }

  searchAppointments(searchRequest: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/appointments/search`, searchRequest);
  }

  updateStatus(appointmentId: string, statusRequest: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/appointments/${appointmentId}/status`, statusRequest);
  }

  cancelAppointment(appointmentId: string, cancelRequest: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/appointments/${appointmentId}/cancel`, cancelRequest);
  }

  getMyUpcomingAppointments(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/my/upcoming`);
  }

  getDoctorUpcomingAppointments(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/doctor/upcoming`);
  }

  getAppointmentsByPatient(patientId: string, page = 0, size = 10): Observable<any> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/patient/${patientId}`, { params });
  }

  getAppointmentsByDoctor(doctorId: string, page = 0, size = 10): Observable<any> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/doctor/${doctorId}`, { params });
  }

  getClinicAppointments(clinicId: string, page = 0, size = 10): Observable<any> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/appointments/clinic/${clinicId}`, { params });
  }
}
