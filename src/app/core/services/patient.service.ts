import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private http = inject(HttpClient);

  // ── Patient Profile CRUD ───────────────────────────────────────────
  createProfile(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/patients/add-profile`, dto);
  }

  getMyProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/me`);
  }

  updateProfile(dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/patients/me/update`, dto);
  }

  // ── Patient Health Profile ─────────────────────────────────────────
  getMyHealthProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/me/health-profile`);
  }

  addHealthProfile(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/patients/me/health-profile/add`, dto);
  }

  updateHealthProfile(dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/patients/me/health-profile/update`, dto);
  }

  // ── Patient Allergies ──────────────────────────────────────────────
  getMyAllergies(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/me/allergies`);
  }

  addAllergy(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/patients/me/allergies/add`, dto);
  }

  updateAllergy(allergyId: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/patients/me/allergies/${allergyId}/update`, dto);
  }

  deleteAllergy(allergyId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/patients/me/allergies/${allergyId}`);
  }

  // ── Patient Chronic Conditions ─────────────────────────────────────
  getMyChronicConditions(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/me/chronic-conditions`);
  }

  addChronicCondition(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/patients/me/add-chronic-condition`, dto);
  }

  updateChronicCondition(conditionId: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/patients/me/chronic-condition/${conditionId}/update`, dto);
  }

  deleteChronicCondition(conditionId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/patients/me/chronic-condition/${conditionId}`);
  }

  // ── Doctor Views (by patientId) ────────────────────────────────────
  getPatientHealthProfile(patientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/${patientId}/health-profile`);
  }

  getPatientAllergies(patientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/${patientId}/allergies`);
  }

  getPatientChronicConditions(patientId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/patients/${patientId}/chronic-conditions`);
  }
}
