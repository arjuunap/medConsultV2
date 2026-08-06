import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ClinicService } from '../../../core/services/clinic.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { UiService } from '../../../core/services/ui.service';
import { TranslatePipe, TranslateObjPipe } from '../../../shared/pipes/translate.pipe';
import { ClinicResponseDto, ClinicDetailResponse, ClinicBranchResponseDto, ClinicOperatingHourResponseDto } from '../../../core/models/clinic.model';
import { DoctorResponseDto, DoctorClinicResponseDto, AppointmentSlotResponseDto } from '../../../core/models/doctor.model';
import { AppointmentType, SessionType } from '../../../core/models/appointment.model';
import { ReferenceService } from '../../../core/services/reference.service';
import { LanguageResponseDto } from '../../../core/models/reference.model';
import { ReviewService, ClinicReviewResponse } from '../../../core/services/review.service';
import { environment } from '../../../../environments/environment';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { ApiUrlPipe } from "../../../shared/pipes/api-url.pipe";

@Component({
  selector: 'app-clinic-explorer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe, TranslateObjPipe, CustomSelectComponent, ApiUrlPipe],
  templateUrl: './clinic-explorer.component.html',
  styleUrls: ['./clinic-explorer.component.css']
})
export class ClinicExplorerComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  public languageService = inject(LanguageService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private referenceService = inject(ReferenceService);
  private reviewService = inject(ReviewService);
  public apiUrl = environment.apiUrl;



  // General State
  public patientId = '';
  public clinics: ClinicResponseDto[] = [];
  public filteredClinics: ClinicResponseDto[] = [];
  public allDoctors: DoctorResponseDto[] = [];
  public doctorToBranchesMap: { [doctorId: string]: DoctorClinicResponseDto[] } = {};
  public globalLanguages: LanguageResponseDto[] = [];

  // Selected State
  public selectedClinic: ClinicDetailResponse | null = null;
  public clinicReviews: ClinicReviewResponse[] = [];
  public showClinicReviews = false;
  public selectedBranch: ClinicBranchResponseDto | null = null;
  public branchOperatingHours: ClinicOperatingHourResponseDto[] = [];
  public branchDoctors: { doctor: DoctorResponseDto; dcLink: DoctorClinicResponseDto; qualifications: any[]; languages: any[] }[] = [];
  public showMobileDetail = false;

  // Search Filter Form
  public searchForm: FormGroup = this.fb.group({
    query: ['']
  });

  // Booking Modal State
  public bookingModalOpen = false;
  public bookingDoctor: DoctorResponseDto | null = null;
  public bookingDcLink: DoctorClinicResponseDto | null = null;
  public availableSlots: AppointmentSlotResponseDto[] = [];
  public selectedSlot: AppointmentSlotResponseDto | null = null;
  public bookingDate = new Date().toISOString().split('T')[0];
  public nextDays: { date: string; label: string; dayName: string; hasSlots: boolean }[] = [];

  public appointmentTypes = Object.values(AppointmentType);
  public sessionTypes = Object.values(SessionType);

  get appointmentTypeOptions() {
    return this.appointmentTypes.map(t => ({
      label: t.replace(/_/g, ' '),
      value: t
    }));
  }

  get sessionTypeOptions() {
    return this.sessionTypes.map(s => ({
      label: s.replace(/_/g, ' '),
      value: s
    }));
  }

  public bookingForm: FormGroup = this.fb.group({
    appointmentType: [AppointmentType.NEW_PATIENT, [Validators.required]],
    sessionType: [SessionType.IN_CLINIC, [Validators.required]],
    reason: ['', [Validators.maxLength(255)]]
  });

  public isSubmittingBooking = false;

  ngOnInit(): void {
    this.loadPatientProfile();
    this.loadInitialData();
  }

  loadPatientProfile(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.patientService.getMyProfile().subscribe({
        next: (p) => this.patientId = p.patientId,
        error: () => { }
      });
    }
  }

  loadInitialData(): void {
    this.uiService.showLoading();
    forkJoin({
      clinics: this.clinicService.getAllClinics().pipe(catchError(() => of([]))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.clinics = res.clinics || [];
        this.filteredClinics = [...this.clinics];
        this.allDoctors = res.doctors || [];
        this.globalLanguages = res.languages || [];

        // Preload doctor clinic assignments in parallel
        if (this.allDoctors.length > 0) {
          const linksRequests = this.allDoctors.map(doc =>
            this.doctorService.getDoctorClinics(doc.doctorId).pipe(catchError(() => of([])))
          );

          forkJoin(linksRequests).subscribe({
            next: (allLinks) => {
              this.doctorToBranchesMap = {};
              this.allDoctors.forEach((doc, idx) => {
                this.doctorToBranchesMap[doc.doctorId] = allLinks[idx] || [];
              });
              this.uiService.hideLoading();
            },
            error: () => {
              this.uiService.hideLoading();
            }
          });
        } else {
          this.uiService.hideLoading();
        }
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onSearch(): void {
    const query = (this.searchForm.value.query || '').toLowerCase().trim();
    if (!query) {
      this.filteredClinics = [...this.clinics];
    } else {
      this.filteredClinics = this.clinics.filter(c =>
        c.nameEn.toLowerCase().includes(query) ||
        c.nameAr.toLowerCase().includes(query) ||
        (c.descriptionEn && c.descriptionEn.toLowerCase().includes(query)) ||
        (c.descriptionAr && c.descriptionAr.toLowerCase().includes(query))
      );
    }
  }

  selectClinic(clinic: ClinicResponseDto): void {
    this.uiService.showLoading();
    this.selectedBranch = null;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
    this.showMobileDetail = true;
    this.clinicReviews = [];
    this.showClinicReviews = false;

    this.clinicService.getClinicDetail(clinic.clinicId).subscribe({
      next: (detail) => {
        this.selectedClinic = detail;
        
        // Fetch reviews
        this.reviewService.getClinicReviews(clinic.clinicId).pipe(
          catchError(() => of({ content: [], totalElements: 0 } as any))
        ).subscribe({
          next: (res) => {
            this.clinicReviews = res && res.content ? res.content : [];
          }
        });
        
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load clinic details.');
      }
    });
  }

  toggleClinicReviews(): void {
    this.showClinicReviews = !this.showClinicReviews;
  }

  goBackToList(): void {
    this.showMobileDetail = false;
    this.selectedClinic = null;
    this.selectedBranch = null;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
  }

  selectBranch(branch: ClinicBranchResponseDto): void {
    this.selectedBranch = branch;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
    this.uiService.showLoading();

    // Fetch operating hours for this branch
    const hours$ = this.clinicService.getBranchHours(branch.branchId).pipe(catchError(() => of([])));

    hours$.subscribe({
      next: (hours) => {
        this.branchOperatingHours = hours || [];

        // Find assigned doctors for this branch
        const matched: { doctor: DoctorResponseDto; dcLink: DoctorClinicResponseDto; qualifications: any[] }[] = [];
        const qualRequests: any[] = [];

        this.allDoctors.forEach(doc => {
          const links = this.doctorToBranchesMap[doc.doctorId] || [];
          const matchedLink = links.find(l => l.branchId === branch.branchId && l.isActive);
          if (matchedLink) {
            // Store query for qualifications and languages
            const req = forkJoin({
              quals: this.doctorService.getDoctorQualifications(doc.doctorId).pipe(catchError(() => of([]))),
              langs: this.doctorService.getDoctorLanguages(doc.doctorId).pipe(catchError(() => of([])))
            }).pipe(
              map(res => ({ doctor: doc, dcLink: matchedLink, qualifications: res.quals, languages: res.langs }))
            );
            qualRequests.push(req);
          }
        });

        if (qualRequests.length > 0) {
          forkJoin(qualRequests).subscribe({
            next: (results: any[]) => {
              this.branchDoctors = results;
              this.uiService.hideLoading();
            },
            error: () => {
              this.uiService.hideLoading();
            }
          });
        } else {
          this.uiService.hideLoading();
        }
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  // Helper translations and getters
  getDaysOfWeekName(day: number): string {
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const idx = day % 7;
    return this.languageService.isArabic ? daysAr[idx] : daysEn[idx];
  }

  getLanguageName(languageId: string): string {
    const lang = this.globalLanguages.find(l => l.languageId === languageId);
    return lang ? this.languageService.translate(lang.nameEn, lang.nameAr) : 'Unknown Language';
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

  // Booking Modal Methods
  openBooking(doctor: DoctorResponseDto, dcLink: DoctorClinicResponseDto): void {
    if (!this.authService.isLoggedIn()) {
      this.uiService.showWarning('Please sign in to confirm your appointment.');
      this.router.navigate(['/login']);
      return;
    }

    if (this.authService.currentUser()?.role !== 'PATIENT') {
      this.uiService.showWarning('Only Patient accounts can book appointments.');
      return;
    }

    if (!this.patientId) {
      this.uiService.showWarning('Please complete your Patient Profile before booking.');
      this.router.navigate(['/patient/profile']);
      return;
    }

    this.bookingDoctor = doctor;
    this.bookingDcLink = dcLink;
    this.bookingDate = new Date().toISOString().split('T')[0];
    this.availableSlots = [];
    this.selectedSlot = null;
    this.nextDays = [];
    this.bookingForm.reset({
      appointmentType: AppointmentType.NEW_PATIENT,
      sessionType: SessionType.IN_CLINIC,
      reason: ''
    });

    this.bookingModalOpen = true;
    this.checkAvailabilityForNext7Days(dcLink.dcId);
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.value && this.bookingDcLink) {
      this.bookingDate = input.value;
      this.fetchSlots(this.bookingDcLink.dcId, this.bookingDate);
    }
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

        // Pre-select the first date with slots, or today if none
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
    if (this.bookingDcLink) {
      this.fetchSlots(this.bookingDcLink.dcId, this.bookingDate);
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

  selectSlot(slot: AppointmentSlotResponseDto): void {
    this.selectedSlot = slot;
  }

  closeBooking(): void {
    this.bookingModalOpen = false;
    this.bookingDoctor = null;
    this.bookingDcLink = null;
    this.availableSlots = [];
    this.selectedSlot = null;
  }

  confirmBooking(): void {
    if (this.bookingForm.invalid || !this.selectedSlot || !this.bookingDcLink) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    this.isSubmittingBooking = true;
    this.uiService.showLoading();

    const payload = {
      patientId: this.patientId,
      dcId: this.bookingDcLink.dcId,
      slotId: this.selectedSlot.slotId,
      appointmentType: this.bookingForm.value.appointmentType,
      scheduledDate: this.bookingDate,
      sessionType: this.bookingForm.value.sessionType,
      reason: this.bookingForm.value.reason || 'Consultation Booking'
    };

    this.appointmentService.bookAppointment(payload).subscribe({
      next: () => {
        this.isSubmittingBooking = false;
        this.uiService.hideLoading();
        this.uiService.showSuccess('Appointment booked successfully!');
        this.closeBooking();
        this.router.navigate(['/patient/home']);
      },
      error: (err) => {
        this.isSubmittingBooking = false;
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to book appointment.');
      }
    });
  }

  getDoctorDisplayName(d: DoctorResponseDto | null | undefined): string {
    if (!d) return '';
    const name = (d.fullName || '').trim();
    const nameLower = name.toLowerCase();
    if (nameLower.startsWith('dr') || nameLower.startsWith('doctor') || nameLower.startsWith('prof') || nameLower.startsWith('consultant') || nameLower.startsWith('specialist') || nameLower.startsWith('د.')) {
      return name;
    }
    const isAr = this.languageService.isArabic;
    const prefix = isAr ? 'د.' : 'Dr.';
    return `${prefix} ${name}`;
  }
}
