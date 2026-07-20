import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReferenceService {
  private http = inject(HttpClient);

  // ── Cities ──────────────────────────────────────────────────────────
  getAllCities(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/cities/all`);
  }

  getCity(cityId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/cities/${cityId}`);
  }

  addCity(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/cities/add`, dto);
  }

  updateCity(cityId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/cities/${cityId}/edit`, dto);
  }

  deleteCity(cityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/cities/${cityId}/delete`, { responseType: 'text' });
  }

  // ── Localities ──────────────────────────────────────────────────────
  getLocalities(cityId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/cities/${cityId}/localities`);
  }

  getLocality(localityId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}`);
  }

  addLocality(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/cities/locality/add`, dto);
  }

  updateLocality(localityId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}/edit`, dto);
  }

  deleteLocality(localityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}/delete`, { responseType: 'text' });
  }

  // ── Languages ───────────────────────────────────────────────────────
  getAllLanguages(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/languages/all`);
  }

  addLanguage(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/languages/add`, dto);
  }

  updateLanguage(id: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/languages/${id}/edit`, dto);
  }

  deleteLanguage(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/languages/${id}/delete`, { responseType: 'text' });
  }

  // ── Specialties ─────────────────────────────────────────────────────
  getAllSpecialties(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/specialties/all`);
  }

  addSpecialty(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/specialties/add`, dto);
  }

  updateSpecialty(specialityId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/edit`, dto);
  }

  deleteSpecialty(specialityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/delete`, { responseType: 'text' });
  }

  // ── Sub-Specialties ─────────────────────────────────────────────────
  getSubSpecialties(specialityId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/sub-specialities`);
  }

  addSubSpecialty(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/specialties/sub/add`, dto);
  }

  updateSubSpecialty(subSpecialtyId: string, dto: any): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/specialties/sub/${subSpecialtyId}/edit`, dto);
  }

  deleteSubSpecialty(subSpecialtyId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/specialties/sub/${subSpecialtyId}/delete`, { responseType: 'text' });
  }

  // ── Insurance Providers ─────────────────────────────────────────────
  getAllInsuranceProviders(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/insurance-providers/all`);
  }

  getInsuranceProvider(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/insurance-providers/${id}`);
  }

  addInsuranceProvider(dto: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/insurance-providers/add-provider`, formData);
  }

  updateInsuranceProvider(id: string, dto: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/insurance-providers/${id}/update`, formData);
  }

  deleteInsuranceProvider(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/insurance-providers/delete/${id}`, { responseType: 'text' });
  }
}
