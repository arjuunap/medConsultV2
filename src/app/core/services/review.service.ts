import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface DoctorReviewRequest {
  doctorId: string;
  appointmentId: string;
  rating: number;
  ratingBedside?: number;
  ratingKnowledge?: number;
  ratingWait?: number;
  reviewText?: string;
  isAnonymous?: boolean;
}

export interface DoctorReviewResponse {
  reviewId: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  rating: number;
  ratingBedside?: number;
  ratingKnowledge?: number;
  ratingWait?: number;
  reviewText?: string;
  isPublished: boolean;
  isAnonymous: boolean;
  doctorReply?: string;
  doctorRepliedAt?: string;
  createdAt: string;
  patientAvatarUrl?: string;
}

export interface ClinicReviewRequest {
  clinicId: string;
  appointmentId: string;
  rating: number;
  ratingCleanliness?: number;
  ratingStaff?: number;
  ratingWait?: number;
  reviewText?: string;
  isAnonymous?: boolean;
}

export interface ClinicReviewResponse {
  reviewId: string;
  clinicId: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  rating: number;
  ratingCleanliness?: number;
  ratingStaff?: number;
  ratingWait?: number;
  reviewText?: string;
  isPublished: boolean;
  isAnonymous: boolean;
  createdAt: string;
  patientAvatarUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/medconsult/reviews`;

  // Submit Doctor Review
  submitDoctorReview(dto: DoctorReviewRequest): Observable<DoctorReviewResponse> {
    return this.http.post<DoctorReviewResponse>(`${this.baseUrl}/doctors/submit`, dto);
  }

  // Submit Clinic Review
  submitClinicReview(dto: ClinicReviewRequest): Observable<ClinicReviewResponse> {
    return this.http.post<ClinicReviewResponse>(`${this.baseUrl}/clinics/submit`, dto);
  }

  // Doctor Reply to Review
  replyToDoctorReview(reviewId: string, replyText: string): Observable<DoctorReviewResponse> {
    return this.http.post<DoctorReviewResponse>(`${this.baseUrl}/doctors/${reviewId}/reply`, { doctorReply: replyText });
  }

  // Get Doctor Reviews (Public View)
  getDoctorReviews(doctorId: string, page = 0, size = 10): Observable<Page<DoctorReviewResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<DoctorReviewResponse>>(`${this.baseUrl}/doctors/${doctorId}`, { params });
  }

  // Get Clinic Reviews (Public View)
  getClinicReviews(clinicId: string, page = 0, size = 10): Observable<Page<ClinicReviewResponse>> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http.get<Page<ClinicReviewResponse>>(`${this.baseUrl}/clinics/${clinicId}`, { params });
  }
}