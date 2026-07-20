import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { UiService } from '../../../core/services/ui.service';
import { DoctorResponseDto, DoctorClinicResponseDto, AppointmentSlotResponseDto } from '../../../core/models/doctor.model';
import { AppointmentType, SessionType } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './book-appointment.component.html',
  styleUrls: []
})
export class BookAppointmentComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  public patientId = '';
  public needProfileInit = false;

  public doctors: DoctorResponseDto[] = [];
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public slots: AppointmentSlotResponseDto[] = [];

  public appointmentTypes: string[] = Object.values(AppointmentType);
  public sessionTypes: string[] = Object.values(SessionType);

  // Form group for selection wizard
  public wizardForm: FormGroup = this.fb.group({
    doctorId: ['', [Validators.required]],
    dcId: ['', [Validators.required]],
    scheduledDate: ['', [Validators.required]],
    slotId: ['', [Validators.required]],
    appointmentType: [AppointmentType.NEW_PATIENT, [Validators.required]],
    sessionType: [SessionType.IN_CLINIC, [Validators.required]],
    reason: ['', [Validators.maxLength(255)]]
  });

  ngOnInit(): void {
    this.checkProfileAndLoad();
  }

  checkProfileAndLoad(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (patient) => {
        this.patientId = patient.patientId;
        this.needProfileInit = false;
        this.loadDoctors();
      },
      error: (err) => {
        this.uiService.hideLoading();
        if (err.status === 404) {
          this.needProfileInit = true;
        }
      }
    });
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (data) => {
        this.doctors = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onDoctorChange(): void {
    const docId = this.wizardForm.value.doctorId;
    this.doctorClinics = [];
    this.slots = [];
    this.wizardForm.patchValue({ dcId: '', slotId: '' });

    if (!docId) return;

    this.uiService.showLoading();
    this.doctorService.getDoctorClinics(docId).subscribe({
      next: (data) => {
        this.doctorClinics = data.filter((c: any) => c.isActive);
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onClinicOrDateChange(): void {
    const dcId = this.wizardForm.value.dcId;
    const date = this.wizardForm.value.scheduledDate;
    this.slots = [];
    this.wizardForm.patchValue({ slotId: '' });

    if (!dcId || !date) return;

    this.uiService.showLoading();
    this.doctorService.getAvailableSlots(dcId, date).subscribe({
      next: (data) => {
        // filter slots status AVAILABLE
        this.slots = data.filter((s: any) => s.status === 'AVAILABLE');
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onSubmit(): void {
    if (this.wizardForm.invalid) {
      this.wizardForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = {
      patientId: this.patientId,
      dcId: this.wizardForm.value.dcId,
      slotId: this.wizardForm.value.slotId,
      appointmentType: this.wizardForm.value.appointmentType,
      scheduledDate: this.wizardForm.value.scheduledDate,
      sessionType: this.wizardForm.value.sessionType,
      reason: this.wizardForm.value.reason
    };

    this.appointmentService.bookAppointment(payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Appointment booked successfully!');
        this.router.navigate(['/patient/home']);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to book appointment.');
      }
    });
  }
}
