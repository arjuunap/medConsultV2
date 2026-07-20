import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private http = inject(HttpClient);

  // ── Public / Read-Only ──────────────────────────────────────────────
  searchClinics(filters: {
    name?: string;
    specialtyId?: string;
    isActive?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters.name) params = params.set('name', filters.name);
    if (filters.specialtyId) params = params.set('specialtyId', filters.specialtyId);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/search`, { params });
  }

  getAllClinics(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/all`);
  }

  getClinicById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}`);
  }

  getClinicDetail(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}/detail`);
  }

  getClinicBranches(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}/branches`);
  }

  getBranchHours(branchId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/branches/${branchId}/hours`);
  }

  getClinicSpecialties(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}/specialties`);
  }

  getClinicInsurances(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}/insurance`);
  }

  getClinicLanguages(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}/languages`);
  }

  // ── Admin-Only / Write ──────────────────────────────────────────────
  createClinic(dto: any, logoFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/clinics/add`, formData);
  }

  updateClinic(id: string, dto: any, logoFile?: File): Observable<any> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/clinics/${id}`, formData);
  }

  deleteClinic(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/clinics/${id}`);
  }

  createClinicBranch(clinicId: string, dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/branches`, dto);
  }

  updateClinicBranch(branchId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/clinics/branches/${branchId}`, dto);
  }

  deleteClinicBranch(branchId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/clinics/branches/${branchId}`);
  }

  updateBranchHours(branchId: string, dtos: any[]): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/clinics/branches/${branchId}/hours`, dtos);
  }

  addClinicSpecialty(clinicId: string, specialtyId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/specialties/${specialtyId}`, {});
  }

  deleteClinicSpecialty(clinicId: string, specialtyId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/specialties/${specialtyId}`);
  }

  addClinicInsurance(clinicId: string, providerId: string, dto?: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/insurance/${providerId}`, dto || {});
  }

  deleteClinicInsurance(clinicId: string, providerId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/insurance/${providerId}`);
  }

  addClinicLanguage(clinicId: string, languageId: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/languages/${languageId}`, {});
  }

  deleteClinicLanguage(clinicId: string, languageId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/clinics/${clinicId}/languages/${languageId}`);
  }
}
