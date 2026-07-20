import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClinicalRecordService {
  private http = inject(HttpClient);

  // ── Prescriptions ──────────────────────────────────────────────────
  searchPrescriptions(filters: {
    patientId?: string;
    doctorId?: string;
    status?: any;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters.patientId) params = params.set('patientId', filters.patientId);
    if (filters.doctorId) params = params.set('doctorId', filters.doctorId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/prescriptions/search`, { params });
  }

  getPrescriptionById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/prescriptions/${id}`);
  }

  createPrescription(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/prescriptions/add`, dto);
  }

  updatePrescription(id: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/prescriptions/${id}`, dto);
  }

  deletePrescription(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/prescriptions/${id}`);
  }

  // ── Prescription Items ─────────────────────────────────────────────
  getPrescriptionItems(prescriptionId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/prescriptions/${prescriptionId}/items`);
  }

  addPrescriptionItem(prescriptionId: string, dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/prescriptions/${prescriptionId}/items`, dto);
  }

  updatePrescriptionItem(itemId: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/prescriptions/items/${itemId}`, dto);
  }

  deletePrescriptionItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/prescriptions/items/${itemId}`);
  }

  // ── Vitals ─────────────────────────────────────────────────────────
  searchVitals(filters: {
    patientId?: string;
    source?: any;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters.patientId) params = params.set('patientId', filters.patientId);
    if (filters.source) params = params.set('source', filters.source);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/vitals/search`, { params });
  }

  getVitalById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/vitals/${id}`);
  }

  createVital(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/vitals/add`, dto);
  }

  updateVital(id: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/vitals/${id}`, dto);
  }

  deleteVital(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/vitals/${id}`);
  }

  // ── Adherence ──────────────────────────────────────────────────────
  searchAdherence(filters: {
    patientId?: string;
    rxItemId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters.patientId) params = params.set('patientId', filters.patientId);
    if (filters.rxItemId) params = params.set('rxItemId', filters.rxItemId);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/adherence/search`, { params });
  }

  getAdherenceById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/adherence/${id}`);
  }

  createAdherence(dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/adherence/add`, dto);
  }

  updateAdherence(id: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/adherence/${id}`, dto);
  }

  deleteAdherence(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/adherence/${id}`);
  }

  // ── Lab Results ────────────────────────────────────────────────────
  searchLabResults(filters: {
    patientId?: string;
    orderedById?: string;
    status?: any;
    overallFlag?: any;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }): Observable<any> {
    let params = new HttpParams();
    if (filters.patientId) params = params.set('patientId', filters.patientId);
    if (filters.orderedById) params = params.set('orderedById', filters.orderedById);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.overallFlag) params = params.set('overallFlag', filters.overallFlag);
    if (filters.page !== undefined) params = params.set('page', filters.page.toString());
    if (filters.size !== undefined) params = params.set('size', filters.size.toString());
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.sortDir) params = params.set('sortDir', filters.sortDir);

    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/lab-results/search`, { params });
  }

  getLabResultById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/lab-results/${id}`);
  }

  createLabResult(dto: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/lab-results/add`, formData);
  }

  updateLabResult(id: string, dto: any, file?: File): Observable<any> {
    const formData = new FormData();
    formData.append('dto', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
    if (file) {
      formData.append('file', file);
    }
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/lab-results/${id}`, formData);
  }

  deleteLabResult(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/lab-results/${id}`);
  }

  // ── Lab Items ──────────────────────────────────────────────────────
  getLabItems(labResultId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/lab-results/${labResultId}/items`);
  }

  addLabItem(labResultId: string, dto: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/lab-results/${labResultId}/items`, dto);
  }

  updateLabItem(itemId: string, dto: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/api/medconsult/lab-results/items/${itemId}`, dto);
  }

  deleteLabItem(itemId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/medconsult/lab-results/items/${itemId}`);
  }
}
