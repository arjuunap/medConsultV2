import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ClinicService } from '../../../core/services/clinic.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ReviewService, ClinicReviewResponse } from '../../../core/services/review.service';
import { UiService } from '../../../core/services/ui.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';
import { environment } from '../../../../environments/environment';

import { ClinicResponseDto, ClinicBranchResponseDto } from '../../../core/models/clinic.model';
import { DoctorClinicResponseDto, DoctorResponseDto } from '../../../core/models/doctor.model';
import { AppointmentResponseDto, AppointmentStatus } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-clinic-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, ApiUrlPipe],
  templateUrl: './clinic-dashboard.component.html',
  styleUrls: ['./clinic-dashboard.component.css']
})
export class ClinicDashboardComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private reviewService = inject(ReviewService);
  private uiService = inject(UiService);
  public languageService = inject(LanguageService);

  public apiUrl = environment.apiUrl;

  // Managed Clinics State
  public clinics: ClinicResponseDto[] = [];
  public selectedClinic: ClinicResponseDto | null = null;
  public branches: ClinicBranchResponseDto[] = [];
  public allDoctors: DoctorResponseDto[] = [];
  public doctorClinics: DoctorClinicResponseDto[] = [];

  // Appointments & Queue
  public appointments: AppointmentResponseDto[] = [];
  public appointmentFilter: 'ALL' | 'TODAY' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' = 'TODAY';
  public isLoadingAppointments = false;

  // Reviews & Feedback
  public reviews: ClinicReviewResponse[] = [];
  public averageRating: number = 0;
  public totalReviews: number = 0;
  public ratingCleanliness: number = 0;
  public ratingStaff: number = 0;
  public ratingWait: number = 0;

  // Selected action modal state
  public selectedAppointmentForAction: AppointmentResponseDto | null = null;
  public statusUpdateModalOpen = false;
  public cancellationReason: string = '';

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.uiService.showLoading();
    forkJoin({
      clinics: this.clinicService.getAllClinics().pipe(catchError(() => of([]))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ clinics, doctors }) => {
        this.clinics = clinics;
        this.allDoctors = doctors;
        this.uiService.hideLoading();

        if (this.clinics.length > 0) {
          this.onClinicSelected(this.clinics[0]);
        }
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onClinicSelected(clinic: ClinicResponseDto): void {
    this.selectedClinic = clinic;
    if (!clinic) return;

    const clinicId = clinic.clinicId;
    this.loadClinicBranches(clinicId);
    this.loadDoctorPlacements();
    this.loadAppointments(clinicId);
    this.loadClinicReviews(clinicId);
  }

  loadClinicBranches(clinicId: string): void {
    this.clinicService.getClinicBranches(clinicId).subscribe({
      next: (branches) => {
        this.branches = branches;
      },
      error: () => {
        this.branches = [];
      }
    });
  }

  loadDoctorPlacements(): void {
    if (!this.allDoctors || this.allDoctors.length === 0) {
      this.doctorClinics = [];
      return;
    }

    const requests = this.allDoctors.map(doc =>
      this.doctorService.getDoctorClinics(doc.doctorId).pipe(catchError(() => of([])))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const flattened = results.flat();
        if (this.selectedClinic) {
          this.doctorClinics = flattened.filter(dc => dc.clinicId === this.selectedClinic?.clinicId);
        } else {
          this.doctorClinics = flattened;
        }
      },
      error: () => {
        this.doctorClinics = [];
      }
    });
  }

  loadAppointments(clinicId: string): void {
    this.isLoadingAppointments = true;
    const searchRequest = {
      page: 0,
      size: 50,
      sortBy: 'scheduledDate',
      sortDir: 'DESC'
    };

    this.appointmentService.searchAppointments(searchRequest).subscribe({
      next: (data) => {
        this.isLoadingAppointments = false;
        if (data && data.content) {
          this.appointments = data.content;
        } else if (Array.isArray(data)) {
          this.appointments = data;
        } else {
          this.appointments = [];
        }
      },
      error: () => {
        this.isLoadingAppointments = false;
        this.appointments = [];
      }
    });
  }

  loadClinicReviews(clinicId: string): void {
    this.reviewService.getClinicReviews(clinicId, 0, 10).subscribe({
      next: (res) => {
        if (res && res.content) {
          this.reviews = res.content;
          this.totalReviews = res.totalElements || res.content.length;
          if (this.reviews.length > 0) {
            const sumRating = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
            this.averageRating = parseFloat((sumRating / this.reviews.length).toFixed(1));

            const sumClean = this.reviews.reduce((acc, r) => acc + (r.ratingCleanliness || r.rating || 0), 0);
            this.ratingCleanliness = parseFloat((sumClean / this.reviews.length).toFixed(1));

            const sumStaff = this.reviews.reduce((acc, r) => acc + (r.ratingStaff || r.rating || 0), 0);
            this.ratingStaff = parseFloat((sumStaff / this.reviews.length).toFixed(1));

            const sumWait = this.reviews.reduce((acc, r) => acc + (r.ratingWait || r.rating || 0), 0);
            this.ratingWait = parseFloat((sumWait / this.reviews.length).toFixed(1));
          } else {
            this.averageRating = 0;
            this.ratingCleanliness = 0;
            this.ratingStaff = 0;
            this.ratingWait = 0;
          }
        }
      },
      error: () => {
        this.reviews = [];
        this.totalReviews = 0;
        this.averageRating = 0;
      }
    });
  }

  // ── Metrics Computations ───────────────────────────────────────────
  get todayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get todayAppointments(): AppointmentResponseDto[] {
    const today = this.todayDateString;
    return this.appointments.filter(a => a.scheduledDate === today);
  }

  get todayBookedCount(): number {
    return this.todayAppointments.filter(a => a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.CONFIRMED).length;
  }

  get todayCompletedCount(): number {
    return this.todayAppointments.filter(a => a.status === AppointmentStatus.COMPLETED).length;
  }

  get todayCancelledCount(): number {
    return this.todayAppointments.filter(a => a.status === AppointmentStatus.CANCELLED).length;
  }

  get activeDoctorsCount(): number {
    const uniqueDocIds = new Set(this.doctorClinics.map(dc => dc.doctorId));
    return uniqueDocIds.size;
  }

  get filteredAppointments(): AppointmentResponseDto[] {
    const today = this.todayDateString;
    switch (this.appointmentFilter) {
      case 'TODAY':
        return this.appointments.filter(a => a.scheduledDate === today);
      case 'SCHEDULED':
        return this.appointments.filter(a => a.status === AppointmentStatus.SCHEDULED || a.status === AppointmentStatus.CONFIRMED);
      case 'COMPLETED':
        return this.appointments.filter(a => a.status === AppointmentStatus.COMPLETED);
      case 'CANCELLED':
        return this.appointments.filter(a => a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.NO_SHOW);
      case 'ALL':
      default:
        return this.appointments;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────
  getDoctor(doctorId: string): DoctorResponseDto | undefined {
    return this.allDoctors.find(d => d.doctorId === doctorId);
  }

  getDoctorName(doctorId: string): string {
    const doc = this.getDoctor(doctorId);
    if (!doc) return 'Dr. Specialist';
    return `${doc.title || 'Dr.'} ${doc.fullName}`;
  }

  getBranchName(branchId: string): string {
    const b = this.branches.find(br => br.branchId === branchId);
    if (!b) return 'Main Branch';
    return this.languageService.isArabic ? (b.branchNameAr || b.branchNameEn) : b.branchNameEn;
  }

  getLogoUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${cleanPath}`;
  }

  // ── Doctor Profile Quick View ──────────────────────────────────────
  public selectedDoctorForProfile: DoctorResponseDto | null = null;
  public selectedDcForProfile: DoctorClinicResponseDto | null = null;
  public isDoctorProfileModalOpen = false;

  openDoctorProfileModal(dc: DoctorClinicResponseDto): void {
    this.selectedDcForProfile = dc;
    this.selectedDoctorForProfile = this.getDoctor(dc.doctorId) || null;
    this.isDoctorProfileModalOpen = true;
  }

  closeDoctorProfileModal(): void {
    this.selectedDoctorForProfile = null;
    this.selectedDcForProfile = null;
    this.isDoctorProfileModalOpen = false;
  }

  public AppointmentStatus = AppointmentStatus;

  // ── Appointment Status Actions ─────────────────────────────────────
  openStatusModal(appointment: AppointmentResponseDto): void {
    this.selectedAppointmentForAction = appointment;
    this.cancellationReason = '';
    this.statusUpdateModalOpen = true;
  }

  closeStatusModal(): void {
    this.selectedAppointmentForAction = null;
    this.statusUpdateModalOpen = false;
    this.cancellationReason = '';
  }

  updateAppointmentStatus(status: AppointmentStatus | string): void {
    if (!this.selectedAppointmentForAction) return;

    const id = this.selectedAppointmentForAction.appointmentId;
    this.uiService.showLoading();

    if (status === AppointmentStatus.CANCELLED || status === 'CANCELLED') {
      const payload = {
        cancelReason: this.cancellationReason || 'Cancelled by Clinic Administration'
      };
      this.appointmentService.cancelAppointment(id, payload).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Appointment cancelled successfully.', 'تم إلغاء الموعد بنجاح.'));
          this.closeStatusModal();
          if (this.selectedClinic) this.loadAppointments(this.selectedClinic.clinicId);
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError(this.languageService.translate('Failed to cancel appointment.', 'فشل إلغاء الموعد.'));
        }
      });
    } else {
      const payload = { status };
      this.appointmentService.updateStatus(id, payload).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Appointment status updated.', 'تم تحديث حالة الموعد.'));
          this.closeStatusModal();
          if (this.selectedClinic) this.loadAppointments(this.selectedClinic.clinicId);
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError(this.languageService.translate('Failed to update status.', 'فشل تحديث الحالة.'));
        }
      });
    }
  }
}
