import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CityRequestDto, CityResponseDto,
  LocalityRequestDto, LocalityResponseDto,
  LanguageRequestDto, LanguageResponseDto,
  SpecialtyRequestDto, SpecialtyResponseDto,
  SubSpecialtyRequestDto, SubSpecialtyResponseDto,
  InsuranceProviderRequestDto, InsuranceProviderResponseDto
} from '../models/reference.model';

@Injectable({
  providedIn: 'root'
})
export class ReferenceService {
  private http = inject(HttpClient);

  // ── Cities ──────────────────────────────────────────────────────────
  getAllCities(): Observable<CityResponseDto[]> {
    return this.http.get<CityResponseDto[]>(`${environment.apiUrl}/api/medconsult/cities/all`);
  }

  getCity(cityId: string): Observable<CityResponseDto> {
    return this.http.get<CityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/${cityId}`);
  }

  addCity(dto: CityRequestDto): Observable<CityResponseDto> {
    return this.http.post<CityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/add`, dto);
  }

  updateCity(cityId: string, dto: CityRequestDto): Observable<CityResponseDto> {
    return this.http.patch<CityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/${cityId}/edit`, dto);
  }

  deleteCity(cityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/cities/${cityId}/delete`, { responseType: 'text' });
  }

  // ── Localities ──────────────────────────────────────────────────────
  getLocalities(cityId: string): Observable<LocalityResponseDto[]> {
    return this.http.get<LocalityResponseDto[]>(`${environment.apiUrl}/api/medconsult/cities/${cityId}/localities`);
  }

  getLocality(localityId: string): Observable<LocalityResponseDto> {
    return this.http.get<LocalityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}`);
  }

  addLocality(dto: LocalityRequestDto): Observable<LocalityResponseDto> {
    return this.http.post<LocalityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/locality/add`, dto);
  }

  updateLocality(localityId: string, dto: LocalityRequestDto): Observable<LocalityResponseDto> {
    return this.http.patch<LocalityResponseDto>(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}/edit`, dto);
  }

  deleteLocality(localityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/cities/locality/${localityId}/delete`, { responseType: 'text' });
  }

  // ── Languages ───────────────────────────────────────────────────────
  getAllLanguages(): Observable<LanguageResponseDto[]> {
    return this.http.get<LanguageResponseDto[]>(`${environment.apiUrl}/api/medconsult/languages/all`);
  }

  addLanguage(dto: LanguageRequestDto): Observable<LanguageResponseDto> {
    return this.http.post<LanguageResponseDto>(`${environment.apiUrl}/api/medconsult/languages/add`, dto);
  }

  updateLanguage(id: string, dto: LanguageRequestDto): Observable<LanguageResponseDto> {
    return this.http.patch<LanguageResponseDto>(`${environment.apiUrl}/api/medconsult/languages/${id}/edit`, dto);
  }

  deleteLanguage(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/languages/${id}/delete`, { responseType: 'text' });
  }

  // ── Specialties ─────────────────────────────────────────────────────
  getAllSpecialties(): Observable<SpecialtyResponseDto[]> {
    return this.http.get<SpecialtyResponseDto[]>(`${environment.apiUrl}/api/medconsult/specialties/all`);
  }

  addSpecialty(dto: SpecialtyRequestDto): Observable<SpecialtyResponseDto> {
    return this.http.post<SpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/specialties/add-specialty`, dto);
  }

  updateSpecialty(specialityId: string, dto: SpecialtyRequestDto): Observable<SpecialtyResponseDto> {
    return this.http.patch<SpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/edit`, dto);
  }

  deleteSpecialty(specialityId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/delete`, { responseType: 'text' });
  }

  // ── Sub-Specialties ─────────────────────────────────────────────────
  getSubSpecialties(specialityId: string): Observable<SubSpecialtyResponseDto[]> {
    return this.http.get<SubSpecialtyResponseDto[]>(`${environment.apiUrl}/api/medconsult/specialties/${specialityId}/sub-specialities`);
  }

  addSubSpecialty(dto: SubSpecialtyRequestDto): Observable<SubSpecialtyResponseDto> {
    return this.http.post<SubSpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/specialties/sub/add`, dto);
  }

  updateSubSpecialty(subSpecialtyId: string, dto: SubSpecialtyRequestDto): Observable<SubSpecialtyResponseDto> {
    return this.http.patch<SubSpecialtyResponseDto>(`${environment.apiUrl}/api/medconsult/specialties/sub/${subSpecialtyId}/edit`, dto);
  }

  deleteSubSpecialty(subSpecialtyId: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/specialties/sub/${subSpecialtyId}/delete`, { responseType: 'text' });
  }

  // ── Insurance Providers ─────────────────────────────────────────────
  getAllInsuranceProviders(): Observable<InsuranceProviderResponseDto[]> {
    return this.http.get<InsuranceProviderResponseDto[]>(`${environment.apiUrl}/api/medconsult/insurance-providers/all`);
  }

  getInsuranceProvider(id: string): Observable<InsuranceProviderResponseDto> {
    return this.http.get<InsuranceProviderResponseDto>(`${environment.apiUrl}/api/medconsult/insurance-providers/${id}`);
  }

  addInsuranceProvider(dto: InsuranceProviderRequestDto, file?: File): Observable<InsuranceProviderResponseDto> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<InsuranceProviderResponseDto>(`${environment.apiUrl}/api/medconsult/insurance-providers/add-provider`, formData);
  }

  updateInsuranceProvider(id: string, dto: InsuranceProviderRequestDto, file?: File): Observable<InsuranceProviderResponseDto> {
    const formData = new FormData();
    formData.append('body', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.put<InsuranceProviderResponseDto>(`${environment.apiUrl}/api/medconsult/insurance-providers/${id}/update`, formData);
  }

  deleteInsuranceProvider(id: string): Observable<string> {
    return this.http.delete(`${environment.apiUrl}/api/medconsult/insurance-providers/delete/${id}`, { responseType: 'text' });
  }
}
