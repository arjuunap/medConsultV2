import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ClinicalRecordService } from '../../../core/services/clinical-record.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientResponseDto } from '../../../core/models/patient.model';
import { AppointmentResponseDto } from '../../../core/models/appointment.model';
import { VitalResponseDto } from '../../../core/models/clinical-record.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrls: []
})
export class HomeComponent implements OnInit {
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private clinicalRecordService = inject(ClinicalRecordService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  public currentUser = this.authService.currentUser;
  public patientProfile: PatientResponseDto | null = null;
  public needProfileInit = false;
  public upcomingAppointments: AppointmentResponseDto[] = [];
  public latestVitals: VitalResponseDto | null = null;

  // Cancellation Modal State
  public selectedCancelAppointment: AppointmentResponseDto | null = null;
  public cancelForm: FormGroup = this.fb.group({
    cancelReason: ['', [Validators.required, Validators.maxLength(255)]]
  });


  ngOnInit(): void {
    this.loadPatientDashboard();
  }

  loadPatientDashboard(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.patientProfile = profile;
        this.needProfileInit = false;
        this.loadUpcomingAppointments();
        this.loadLatestVitals(profile.patientId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        const errorMessage = err.error?.message || '';
        if (err.status === 404 || errorMessage.includes('not found')) {
          this.needProfileInit = true;
        } else {
          this.uiService.showError('Failed to load patient profile.');
        }
      }
    });
  }

  loadUpcomingAppointments(): void {
    this.appointmentService.getMyUpcomingAppointments().subscribe({
      next: (data) => {
        this.upcomingAppointments = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  loadLatestVitals(patientId: string): void {
    this.clinicalRecordService.searchVitals({
      patientId,
      page: 0,
      size: 1,
      sortBy: 'recordedAt',
      sortDir: 'desc'
    }).subscribe({
      next: (page) => {
        if (page.content && page.content.length > 0) {
          this.latestVitals = page.content[0];
        }
      },
      error: () => {}
    });
  }

  openCancelModal(app: AppointmentResponseDto): void {
    this.selectedCancelAppointment = app;
    this.cancelForm.reset();
  }

  closeCancelModal(): void {
    this.selectedCancelAppointment = null;
  }

  submitCancel(): void {
    if (this.cancelForm.invalid || !this.selectedCancelAppointment) {
      this.cancelForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const reason = this.cancelForm.value.cancelReason;
    this.appointmentService.cancelAppointment(this.selectedCancelAppointment.appointmentId, { cancelReason: reason }).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Appointment cancelled successfully.');
        this.closeCancelModal();
        this.loadPatientDashboard(); // Reload data
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to cancel appointment.');
      }
    });
  }
}
