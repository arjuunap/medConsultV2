import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { DoctorClinicResponseDto, AppointmentSlotResponseDto, SessionType, SlotStatus } from '../../../core/models/doctor.model';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './availability.component.html',
  styleUrls: []
})
export class AvailabilityComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public doctorId = '';
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public slots: AppointmentSlotResponseDto[] = [];
  public sessionTypes = Object.values(SessionType);

  public filterForm: FormGroup = this.fb.group({
    dcId: ['', [Validators.required]],
    date: [new Date().toISOString().split('T')[0], [Validators.required]]
  });

  public isAddModalOpen = false;
  public slotForm: FormGroup = this.fb.group({
    startTime: ['09:00:00', [Validators.required]],
    endTime: ['09:30:00', [Validators.required]],
    sessionType: [SessionType.IN_CLINIC, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadDoctorProfile();
  }

  loadDoctorProfile(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.uiService.showLoading();
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        // Try to match by email (if available on doctor obj), then by fullName (case-insensitive)
        const doc = docs.find((d: any) =>
          (d.email && d.email.toLowerCase() === user.email?.toLowerCase()) ||
          (d.fullName && d.fullName.trim().toLowerCase() === user.fullName?.trim().toLowerCase())
        );
        if (doc) {
          this.doctorId = doc.doctorId;
          this.loadClinics();
        } else {
          this.uiService.hideLoading();
          this.uiService.showError('Doctor profile not found for this account. Please contact admin.');
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadClinics(): void {
    this.doctorService.getDoctorClinics(this.doctorId).subscribe({
      next: (data) => {
        this.doctorClinics = data.filter((c: any) => c.isActive);
        if (this.doctorClinics.length > 0) {
          this.filterForm.patchValue({ dcId: this.doctorClinics[0].dcId });
          this.loadSlots();
        } else {
          this.uiService.hideLoading();
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadSlots(): void {
    const dcId = this.filterForm.value.dcId;
    const date = this.filterForm.value.date;
    if (!dcId || !date) return;

    this.uiService.showLoading();
    this.doctorService.getAvailableSlots(dcId, date).subscribe({
      next: (data) => {
        this.slots = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.slots = [];
      }
    });
  }

  openAddModal(): void {
    this.slotForm.reset({
      startTime: '09:00:00',
      endTime: '09:30:00',
      sessionType: SessionType.IN_CLINIC
    });
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
  }

  submitSlot(): void {
    if (this.slotForm.invalid) {
      this.slotForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = {
      dcId: this.filterForm.value.dcId,
      slotDate: this.filterForm.value.date,
      startTime: this.slotForm.value.startTime,
      endTime: this.slotForm.value.endTime,
      sessionType: this.slotForm.value.sessionType,
      status: SlotStatus.AVAILABLE
    };

    this.doctorService.addSlot(payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Slot added successfully.');
        this.closeAddModal();
        this.loadSlots();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to add slot.');
      }
    });
  }

  deleteSlot(slotId: string): void {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;

    this.uiService.showLoading();
    this.doctorService.removeSlot(slotId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Slot deleted successfully.');
        this.loadSlots();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove slot.');
      }
    });
  }
}
