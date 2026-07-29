import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe, TranslateObjPipe } from '../../../shared/pipes/translate.pipe';
import { AppointmentStatus, AppointmentType, SessionType } from '../../../core/models/appointment.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.css']
})
export class AppointmentsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  public languageService = inject(LanguageService);

  public apiUrl = environment.apiUrl;
  public patientId = '';
  public appointments: any[] = [];
  public filteredAppointments: any[] = [];
  public activeTab: 'upcoming' | 'history' | 'all' = 'upcoming';

  // Details Modal State
  public selectedAppointment: any | null = null;
  public showDetailsModal = false;

  // Cancellation Modal State
  public showCancelModal = false;
  public cancelForm: FormGroup = this.fb.group({
    cancelReason: ['', [Validators.required, Validators.maxLength(255)]]
  });

  // Reschedule Modal State
  public rescheduleModalOpen = false;
  public bookingDate = '';
  public nextDays: { date: string; label: string; dayName: string; hasSlots: boolean }[] = [];
  public availableSlots: any[] = [];
  public selectedSlot: any | null = null;
  public isSubmittingReschedule = false;

  // Cache doctor clinic relations for displaying clinic names
  private doctorClinicsCache: { [doctorId: string]: any[] } = {};

  ngOnInit(): void {
    this.loadPatientProfile();
  }

  loadPatientProfile(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.uiService.showLoading();
      this.patientService.getMyProfile().subscribe({
        next: (p) => {
          this.patientId = p.patientId;
          this.loadAppointments();
        },
        error: (err) => {
          this.uiService.hideLoading();
          const msg = err.error?.message || '';
          if (err.status === 404 || msg.includes('not found')) {
            this.uiService.showWarning('Please initialize your Patient Profile first.');
            this.router.navigate(['/patient/profile']);
          } else {
            this.uiService.showError('Failed to load Patient Profile.');
          }
        }
      });
    }
  }

  loadAppointments(): void {
    if (!this.patientId) return;

    this.uiService.showLoading();
    this.appointmentService.getMyAppointments(0, 100).subscribe({
      next: (page) => {
        const rawList = page.content || [];

        if (rawList.length === 0) {
          this.appointments = [];
          this.filterAppointments();
          this.uiService.hideLoading();
          return;
        }

        // Parallel resolve doctor clinics for clinic names
        const uniqueDocIds = Array.from(new Set(rawList.map((a: any) => a.doctorId))) as string[];
        const uncachedDocIds = uniqueDocIds.filter(id => !this.doctorClinicsCache[id]);

        if (uncachedDocIds.length === 0) {
          this.mapAndSetAppointments(rawList);
        } else {
          const reqs = uncachedDocIds.map(docId =>
            this.doctorService.getDoctorClinics(docId).pipe(
              map(clinics => ({ docId, clinics })),
              catchError(() => of({ docId, clinics: [] }))
            )
          );

          forkJoin(reqs).subscribe({
            next: (resList) => {
              resList.forEach(res => {
                this.doctorClinicsCache[res.docId] = res.clinics || [];
              });
              this.mapAndSetAppointments(rawList);
            },
            error: () => {
              this.mapAndSetAppointments(rawList);
            }
          });
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load appointments.');
      }
    });
  }

  private mapAndSetAppointments(rawList: any[]): void {
    this.appointments = rawList.map((app: any) => {
      const clinics = this.doctorClinicsCache[app.doctorId] || [];
      const link = clinics.find(c => c.dcId === app.dcId);
      return {
        ...app,
        clinicNameEn: link?.clinicNameEn || 'Private Clinic',
        clinicNameAr: link?.clinicNameAr || 'عيادة خاصة',
        branchNameEn: link?.branchNameEn || 'Main Branch',
        branchNameAr: link?.branchNameAr || 'الفرع الرئيسي',
        department: link?.department || 'General Medicine',
        consultationFeeSar: link?.consultationFeeSar ?? 100
      };
    });

    // Sort by scheduledDate desc, startTime desc
    this.appointments.sort((a, b) => {
      const dateCompare = b.scheduledDate.localeCompare(a.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return b.startTime.localeCompare(a.startTime);
    });

    this.filterAppointments();
    this.uiService.hideLoading();
  }

  filterAppointments(): void {
    if (this.activeTab === 'upcoming') {
      this.filteredAppointments = this.appointments.filter(
        app => app.status === AppointmentStatus.SCHEDULED || app.status === AppointmentStatus.CONFIRMED
      );
    } else if (this.activeTab === 'history') {
      this.filteredAppointments = this.appointments.filter(
        app => app.status === AppointmentStatus.COMPLETED || app.status === AppointmentStatus.CANCELLED || app.status === AppointmentStatus.NO_SHOW
      );
    } else {
      this.filteredAppointments = [...this.appointments];
    }
  }

  switchTab(tab: 'upcoming' | 'history' | 'all'): void {
    this.activeTab = tab;
    this.filterAppointments();
  }

  // Details Modal
  openDetails(app: any): void {
    this.selectedAppointment = app;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedAppointment = null;
    this.showDetailsModal = false;
  }

  // Cancellation Modal
  openCancel(app: any): void {
    this.selectedAppointment = app;
    this.cancelForm.reset({ cancelReason: '' });
    this.showCancelModal = true;
  }

  closeCancel(): void {
    this.showCancelModal = false;
  }

  submitCancel(): void {
    if (this.cancelForm.invalid || !this.selectedAppointment) {
      this.cancelForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const reason = this.cancelForm.value.cancelReason;

    this.appointmentService.cancelAppointment(this.selectedAppointment.appointmentId, { cancelReason: reason }).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Appointment cancelled successfully!');
        this.closeCancel();
        this.loadAppointments();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to cancel appointment.');
      }
    });
  }

  // Rescheduling Modal
  openReschedule(app: any): void {
    this.selectedAppointment = app;
    this.bookingDate = new Date().toISOString().split('T')[0];
    this.nextDays = [];
    this.availableSlots = [];
    this.selectedSlot = null;
    this.rescheduleModalOpen = true;

    this.checkAvailabilityForNext7Days(app.dcId);
  }

  closeReschedule(): void {
    this.rescheduleModalOpen = false;
  }

  checkAvailabilityForNext7Days(dcId: string): void {
    this.uiService.showLoading();
    const today = new Date();
    const dates: string[] = [];
    const requests = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push(dateStr);
      requests.push(this.doctorService.getAvailableSlots(dcId, dateStr).pipe(
        catchError(() => of([]))
      ));
    }

    forkJoin(requests).subscribe({
      next: (results) => {
        this.nextDays = dates.map((dateStr, idx) => {
          const slotsForDay = results[idx] || [];
          const availableSlots = slotsForDay.filter(s => s.status === 'AVAILABLE');

          const d = new Date(dateStr);
          const label = d.toLocaleDateString(this.languageService.isArabic ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' });
          const dayName = d.toLocaleDateString(this.languageService.isArabic ? 'ar-SA' : 'en-US', { weekday: 'short' });

          return {
            date: dateStr,
            label,
            dayName,
            hasSlots: availableSlots.length > 0
          };
        });

        const firstAvailable = this.nextDays.find(d => d.hasSlots);
        const defaultDate = firstAvailable ? firstAvailable.date : this.bookingDate;
        this.bookingDate = defaultDate;
        this.fetchSlots(dcId, this.bookingDate);
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  selectDateChip(dateStr: string): void {
    this.bookingDate = dateStr;
    if (this.selectedAppointment) {
      this.fetchSlots(this.selectedAppointment.dcId, this.bookingDate);
    }
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.value && this.selectedAppointment) {
      this.bookingDate = input.value;
      this.fetchSlots(this.selectedAppointment.dcId, this.bookingDate);
    }
  }

  fetchSlots(dcId: string, date: string): void {
    this.uiService.showLoading();
    this.doctorService.getAvailableSlots(dcId, date).subscribe({
      next: (slots) => {
        this.availableSlots = slots || [];
        const firstAvail = this.availableSlots.find(s => s.status === 'AVAILABLE');
        this.selectedSlot = firstAvail || null;
        this.uiService.hideLoading();
      },
      error: () => {
        this.availableSlots = [];
        this.selectedSlot = null;
        this.uiService.hideLoading();
      }
    });
  }

  selectSlot(slot: any): void {
    this.selectedSlot = slot;
  }

  confirmReschedule(): void {
    if (!this.selectedSlot || !this.selectedAppointment) return;

    this.isSubmittingReschedule = true;
    this.uiService.showLoading();

    const bookingDto = {
      dcId: this.selectedAppointment.dcId,
      patientId: this.patientId,
      slotId: this.selectedSlot.slotId,
      appointmentType: this.selectedAppointment.appointmentType,
      sessionType: this.selectedAppointment.sessionType,
      reason: this.selectedAppointment.reason || 'Rescheduled consultation'
    };

    // 1. Book new appointment
    this.appointmentService.bookAppointment(bookingDto).subscribe({
      next: () => {
        // 2. Cancel old appointment
        this.appointmentService.cancelAppointment(this.selectedAppointment.appointmentId, {
          cancelReason: 'Rescheduled to new slot on ' + this.bookingDate
        }).subscribe({
          next: () => {
            this.isSubmittingReschedule = false;
            this.uiService.hideLoading();
            this.uiService.showSuccess('Appointment rescheduled successfully!');
            this.closeReschedule();
            this.loadAppointments();
          },
          error: () => {
            this.isSubmittingReschedule = false;
            this.uiService.hideLoading();
            this.uiService.showWarning('New slot booked, but failed to cancel the old appointment. Please contact support.');
            this.closeReschedule();
            this.loadAppointments();
          }
        });
      },
      error: (err) => {
        this.isSubmittingReschedule = false;
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to book the new slot. Reschedule cancelled.');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return 'DR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarBg(name: string): string {
    const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
    const idx = name ? name.charCodeAt(0) : 0;
    return bgColors[idx % bgColors.length];
  }

  getAvatarColor(name: string): string {
    const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];
    const idx = name ? name.charCodeAt(0) : 0;
    return textColors[idx % textColors.length];
  }
}
