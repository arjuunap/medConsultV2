import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { 
  DoctorClinicResponseDto, AppointmentSlotResponseDto, SessionType, SlotStatus,
  DoctorScheduleResponseDto, DoctorLeaveResponseDto, LeaveType 
} from '../../../core/models/doctor.model';
import { ClinicService } from '../../../core/services/clinic.service';
import { forkJoin, map } from 'rxjs';

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './availability.component.html',
  styleUrls: ['./availability.component.css']
})
export class AvailabilityComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private clinicService = inject(ClinicService);

  public activeTab: 'schedule' | 'leaves' | 'slots' = 'schedule';

  public doctorId = '';
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public selectedDcId = '';

  // Data
  public schedules: DoctorScheduleResponseDto[] = [];
  public leaves: DoctorLeaveResponseDto[] = [];
  public slots: AppointmentSlotResponseDto[] = [];

  // Enums
  public sessionTypes = Object.values(SessionType);
  public leaveTypes = Object.values(LeaveType);
  public daysOfWeek = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' }
  ];

  // Forms
  public clinicSelectForm: FormGroup = this.fb.group({
    dcId: ['', [Validators.required]]
  });

  public scheduleForm: FormGroup = this.fb.group({
    dayOfWeek: [1, Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required],
    slotDurationMin: [30, [Validators.required, Validators.min(5)]],
    sessionType: [SessionType.IN_CLINIC, Validators.required]
  });

  public leaveForm: FormGroup = this.fb.group({
    leaveType: [LeaveType.ANNUAL, Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    notes: ['']
  });

  public slotFilterForm: FormGroup = this.fb.group({
    date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  public slotForm: FormGroup = this.fb.group({
    startTime: ['09:00', Validators.required],
    endTime: ['09:30', Validators.required],
    sessionType: [SessionType.IN_CLINIC, Validators.required]
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
        const doc = docs.find((d: any) =>
          (d.email && d.email.toLowerCase() === user.email?.toLowerCase()) ||
          (d.fullName && d.fullName.trim().toLowerCase() === user.fullName?.trim().toLowerCase())
        );
        if (doc) {
          this.doctorId = doc.doctorId;
          this.loadClinics();
        } else {
          this.uiService.hideLoading();
          this.uiService.showError('Doctor profile not found for this account.');
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadClinics(): void {
    this.doctorService.getDoctorClinics(this.doctorId).subscribe({
      next: (data) => {
        const activeClinics = data.filter((c: any) => c.isActive);
        
        if (activeClinics.length === 0) {
          this.doctorClinics = [];
          this.uiService.hideLoading();
          return;
        }

        const nameRequests = activeClinics.map(dc => {
          return forkJoin({
            clinic: this.clinicService.getClinicById(dc.clinicId),
            branches: this.clinicService.getClinicBranches(dc.clinicId)
          }).pipe(
            map(res => {
              dc.clinicNameEn = res.clinic.nameEn;
              const branch = res.branches.find(b => b.branchId === dc.branchId);
              dc.branchNameEn = branch ? branch.branchNameEn : 'Unknown Branch';
              return dc;
            })
          );
        });

        forkJoin(nameRequests).subscribe({
          next: (updatedClinics) => {
            this.doctorClinics = updatedClinics;
            if (this.doctorClinics.length > 0) {
              this.clinicSelectForm.patchValue({ dcId: this.doctorClinics[0].dcId });
              this.onClinicChange();
            } else {
              this.uiService.hideLoading();
            }
          },
          error: () => {
            this.doctorClinics = activeClinics;
            if (this.doctorClinics.length > 0) {
              this.clinicSelectForm.patchValue({ dcId: this.doctorClinics[0].dcId });
              this.onClinicChange();
            } else {
              this.uiService.hideLoading();
            }
          }
        });
      },
      error: () => this.uiService.hideLoading()
    });
  }

  onClinicChange(): void {
    this.selectedDcId = this.clinicSelectForm.value.dcId;
    if (!this.selectedDcId) return;
    this.loadTabData();
  }

  switchTab(tab: 'schedule' | 'leaves' | 'slots'): void {
    this.activeTab = tab;
    this.loadTabData();
  }

  loadTabData(): void {
    if (!this.selectedDcId) return;
    
    this.uiService.showLoading();
    if (this.activeTab === 'schedule') {
      this.doctorService.getDcSchedules(this.selectedDcId).subscribe({
        next: (data) => { this.schedules = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'leaves') {
      this.doctorService.getDcLeave(this.selectedDcId).subscribe({
        next: (data) => { this.leaves = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'slots') {
      this.loadSlots();
    }
  }

  // ── SCHEDULES ──────────────────────────────────────────────
  submitSchedule(): void {
    if (this.scheduleForm.invalid) return;
    this.uiService.showLoading();
    const payload = {
      ...this.scheduleForm.value,
      dcId: this.selectedDcId,
      maxPatients: 20, // default or calculated
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0]
    };

    this.doctorService.addSchedule(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Schedule added');
        this.loadTabData();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding schedule');
      }
    });
  }

  removeSchedule(id: string): void {
    if (!confirm('Remove this schedule?')) return;
    this.uiService.showLoading();
    this.doctorService.removeSchedule(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Schedule removed');
        this.loadTabData();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing schedule');
      }
    });
  }

  getDayName(day: number): string {
    const d = this.daysOfWeek.find(x => x.value === day);
    return d ? d.label : day.toString();
  }

  // ── LEAVES ─────────────────────────────────────────────────
  submitLeave(): void {
    if (this.leaveForm.invalid) return;
    this.uiService.showLoading();
    const payload = {
      ...this.leaveForm.value,
      dcId: this.selectedDcId,
      isApproved: false // typically false until admin approves
    };

    this.doctorService.addLeave(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Leave request submitted');
        this.loadTabData();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error submitting leave');
      }
    });
  }

  removeLeave(id: string): void {
    if (!confirm('Remove this leave request?')) return;
    this.uiService.showLoading();
    this.doctorService.removeLeave(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Leave removed');
        this.loadTabData();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing leave');
      }
    });
  }

  // ── SLOTS ──────────────────────────────────────────────────
  loadSlots(): void {
    const date = this.slotFilterForm.value.date;
    if (!date) {
      this.uiService.hideLoading();
      return;
    }
    this.doctorService.getAvailableSlots(this.selectedDcId, date).subscribe({
      next: (data) => {
        this.slots = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.slots = [];
        this.uiService.hideLoading();
      }
    });
  }

  submitSlot(): void {
    if (this.slotForm.invalid) return;
    this.uiService.showLoading();
    
    // Ensure seconds are included if missing (backend might expect HH:mm:ss)
    let st = this.slotForm.value.startTime;
    if (st.length === 5) st += ':00';
    let et = this.slotForm.value.endTime;
    if (et.length === 5) et += ':00';

    const payload = {
      ...this.slotForm.value,
      startTime: st,
      endTime: et,
      dcId: this.selectedDcId,
      slotDate: this.slotFilterForm.value.date,
      status: SlotStatus.AVAILABLE
    };

    this.doctorService.addSlot(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Slot added');
        this.loadSlots();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding slot');
      }
    });
  }

  deleteSlot(id: string): void {
    if (!confirm('Remove this slot?')) return;
    this.uiService.showLoading();
    this.doctorService.removeSlot(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Slot removed');
        this.loadSlots();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing slot');
      }
    });
  }

  generateSlotsForDate(): void {
    if (!this.selectedDcId) return;
    const dateStr = this.slotFilterForm.value.date;
    if (!dateStr) {
      this.uiService.showError('Please select a date first.');
      return;
    }

    const date = new Date(dateStr);
    const javaDayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // 1 = Monday, 7 = Sunday
    
    // Fetch schedules if they aren't loaded (ensure we have them)
    this.uiService.showLoading();
    this.doctorService.getDcSchedules(this.selectedDcId).subscribe({
      next: (schedules) => {
        const schedule = schedules.find(s => s.dayOfWeek === javaDayOfWeek && s.isActive);
        if (!schedule) {
          this.uiService.hideLoading();
          this.uiService.showError('No active schedule rule found for this day of the week.');
          return;
        }

        const slotsToCreate: any[] = [];
        let current = new Date(`${dateStr}T${schedule.startTime}`);
        const end = new Date(`${dateStr}T${schedule.endTime}`);
        
        while (current < end) {
          const startTimeStr = current.toTimeString().substring(0, 8);
          current = new Date(current.getTime() + schedule.slotDurationMin * 60000);
          const endTimeStr = current.toTimeString().substring(0, 8);
          
          if (current <= end) {
            slotsToCreate.push({
              dcId: this.selectedDcId,
              scheduleId: schedule.scheduleId,
              slotDate: dateStr,
              startTime: startTimeStr,
              endTime: endTimeStr,
              sessionType: schedule.sessionType,
              status: SlotStatus.AVAILABLE
            });
          }
        }

        if (slotsToCreate.length === 0) {
          this.uiService.hideLoading();
          this.uiService.showError('Schedule times invalid or too short to generate slots.');
          return;
        }

        const requests = slotsToCreate.map(payload => this.doctorService.addSlot(payload));
        forkJoin(requests).subscribe({
          next: () => {
            this.uiService.showSuccess(`Generated ${slotsToCreate.length} slots successfully.`);
            this.loadSlots();
          },
          error: () => {
            this.uiService.hideLoading();
            this.uiService.showError('Error generating some slots. They might already exist.');
            this.loadSlots();
          }
        });
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load schedules.');
      }
    });
  }
}
