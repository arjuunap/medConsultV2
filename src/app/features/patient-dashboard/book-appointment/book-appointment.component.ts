import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { UiService } from '../../../core/services/ui.service';
import { DoctorResponseDto, DoctorClinicResponseDto, AppointmentSlotResponseDto } from '../../../core/models/doctor.model';
import { AppointmentType, SessionType } from '../../../core/models/appointment.model';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { SpecialtyResponseDto } from '../../../core/models/reference.model';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';
import { forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe, ApiUrlPipe, CustomSelectComponent],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private clinicService = inject(ClinicService);
  public langService = inject(LanguageService);
  private route = inject(ActivatedRoute);

  public patientId = '';
  public needProfileInit = false;

  // Active step flow navigation state
  public currentStep = 1;
  public nextDays: any[] = [];
  public doctorSearchQuery = '';

  // Step 1 Filtering & Sorting state
  public selectedSpecialtyId = '';
  public selectedMinExperience = 0;
  public selectedSortOption = 'rating';
  public specialties: SpecialtyResponseDto[] = [];
  public doctorSpecialtiesMap: { [doctorId: string]: string[] } = {};

  get specialtyOptions() {
    const isAr = this.langService.isArabic;
    return [
      { label: isAr ? 'جميع التخصصات' : 'All Specialties', value: '' },
      ...this.specialties.map(s => ({
        label: isAr ? s.nameAr : s.nameEn,
        value: s.specialtyId
      }))
    ];
  }

  get experienceOptions() {
    const isAr = this.langService.isArabic;
    return [
      { label: isAr ? 'جميع الخبرات' : 'Any Experience', value: 0 },
      { label: isAr ? '+3 سنوات' : '3+ Years', value: 3 },
      { label: isAr ? '+5 سنوات' : '5+ Years', value: 5 },
      { label: isAr ? '+10 سنوات' : '10+ Years', value: 10 }
    ];
  }

  get sortOptions() {
    const isAr = this.langService.isArabic;
    return [
      { label: isAr ? 'الأعلى تقييماً' : 'Highest Rating', value: 'rating' },
      { label: isAr ? 'الأكثر خبرة' : 'Most Experienced', value: 'experience' },
      { label: isAr ? 'السعر: من الأقل إلى الأعلى' : 'Fee: Low to High', value: 'fee_asc' },
      { label: isAr ? 'السعر: من الأعلى إلى الأقل' : 'Fee: High to Low', value: 'fee_desc' },
      { label: isAr ? 'الاسم (أ - ي)' : 'Name (A-Z)', value: 'name' }
    ];
  }

  // Data lists
  public doctors: DoctorResponseDto[] = [];
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public slots: AppointmentSlotResponseDto[] = [];

  public appointmentTypes = Object.values(AppointmentType);
  public sessionTypes = Object.values(SessionType);

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

  get filteredDoctors() {
    let result = [...this.doctors];

    // Text search query filter (Name, Bio)
    if (this.doctorSearchQuery) {
      const q = this.doctorSearchQuery.toLowerCase().trim();
      result = result.filter(d => 
        d.fullName.toLowerCase().includes(q) || 
        (d.bioEn && d.bioEn.toLowerCase().includes(q)) ||
        (d.bioAr && d.bioAr.toLowerCase().includes(q))
      );
    }

    // Specialty filter
    if (this.selectedSpecialtyId) {
      result = result.filter(d => {
        const docSpecs = this.doctorSpecialtiesMap[d.doctorId] || [];
        return docSpecs.includes(this.selectedSpecialtyId);
      });
    }

    // Min Experience filter
    if (this.selectedMinExperience > 0) {
      result = result.filter(d => (d.experienceYears || 0) >= Number(this.selectedMinExperience));
    }

    // Sorting
    result.sort((a, b) => {
      if (this.selectedSortOption === 'rating') {
        return (b.overallRating || 0) - (a.overallRating || 0);
      } else if (this.selectedSortOption === 'experience') {
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      } else if (this.selectedSortOption === 'fee_asc') {
        return (a.consultationFeeSar || 0) - (b.consultationFeeSar || 0);
      } else if (this.selectedSortOption === 'fee_desc') {
        return (b.consultationFeeSar || 0) - (a.consultationFeeSar || 0);
      } else if (this.selectedSortOption === 'name') {
        return a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });

    return result;
  }

  resetDoctorFilters(): void {
    this.doctorSearchQuery = '';
    this.selectedSpecialtyId = '';
    this.selectedMinExperience = 0;
    this.selectedSortOption = 'rating';
  }

  ngOnInit(): void {
    this.initNextDays();
    this.checkProfileAndLoad();
  }

  initNextDays(): void {
    const isAr = this.langService.isArabic;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayNum: d.getDate().toString(),
        dayName: d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short' })
      });
    }
    this.nextDays = days;
  }

  public activeBookedDoctorIds: string[] = [];

  checkProfileAndLoad(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (patient) => {
        if (patient && patient.patientId) {
          this.patientId = patient.patientId;
          this.needProfileInit = false;
          this.loadExistingAppointments();
        } else {
          this.uiService.hideLoading();
          this.needProfileInit = true;
        }
      }
    });
  }

  loadExistingAppointments(): void {
    this.appointmentService.getMyAppointments(0, 100).pipe(
      catchError(() => of({ content: [] }))
    ).subscribe({
      next: (res) => {
        const list = res?.content || [];
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        // Extract doctorId from active upcoming appointments (SCHEDULED or CONFIRMED status, date >= today)
        this.activeBookedDoctorIds = list
          .filter((appt: any) => 
            (appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED') &&
            appt.scheduledDate >= todayStr
          )
          .map((appt: any) => appt.doctorId)
          .filter(Boolean);
          
        this.loadDoctors();
      },
      error: () => {
        this.loadDoctors();
      }
    });
  }

  public doctorPrimarySpecialtyMap: { [doctorId: string]: { nameEn: string, nameAr: string } } = {};

  getDoctorPrimarySpecialtyName(doctorId: string): string {
    const isAr = this.langService.isArabic;
    const specObj = this.doctorPrimarySpecialtyMap[doctorId];
    if (specObj) {
      return isAr ? specObj.nameAr : specObj.nameEn;
    }
    return isAr ? 'طبيب عام' : 'General Practitioner';
  }

  viewDoctorProfile(doctorId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/doctors', doctorId]);
  }

  loadDoctors(): void {
    forkJoin({
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([]))),
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.doctors = res.doctors;
        this.specialties = res.specialties;

        if (this.doctors.length > 0) {
          const specCalls = this.doctors.map(doc =>
            this.doctorService.getDoctorSpecialties(doc.doctorId).pipe(
              catchError(() => of([])),
              map(specs => ({ doctorId: doc.doctorId, specs }))
            )
          );
          forkJoin(specCalls).subscribe(resList => {
            resList.forEach(item => {
              this.doctorSpecialtiesMap[item.doctorId] = item.specs.map(s => s.specialtyId);
              
              const primarySpec = item.specs.find(s => s.isPrimary) || item.specs[0];
              if (primarySpec) {
                const specDetails = this.specialties.find(s => s.specialtyId === primarySpec.specialtyId);
                if (specDetails) {
                  this.doctorPrimarySpecialtyMap[item.doctorId] = {
                    nameEn: specDetails.nameEn,
                    nameAr: specDetails.nameAr
                  };
                }
              }
            });
          });
        }
        
        // Read optional doctorId & dcId query parameters
        this.route.queryParams.subscribe(params => {
          const docId = params['doctorId'];
          const dcId = params['dcId'];
          if (docId && this.doctors.some(d => d.doctorId === docId)) {
            // Early prevent pre-selected duplicate active booking
            if (this.activeBookedDoctorIds.includes(docId)) {
              this.uiService.showError('You already have an active appointment with this doctor.');
              this.wizardForm.patchValue({ doctorId: '' });
              this.currentStep = 1;
            } else {
              this.wizardForm.patchValue({ doctorId: docId });
              this.onDoctorChange(dcId);
              this.currentStep = 2; // Auto advance to step 2 directly
            }
          }
        });

        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  onDoctorChange(preselectDcId?: string): void {
    const docId = this.wizardForm.value.doctorId;
    this.doctorClinics = [];
    this.slots = [];
    this.wizardForm.patchValue({ dcId: '', slotId: '' });

    if (!docId) return;

    this.uiService.showLoading();
    this.doctorService.getDoctorClinics(docId).subscribe({
      next: (data) => {
        const activeClinics = data.filter((c: any) => c.isActive);

        if (activeClinics.length === 0) {
          this.doctorClinics = [];
          this.uiService.hideLoading();
          return;
        }

        const nameRequests = activeClinics.map(dc => {
          return forkJoin({
            clinic: this.clinicService.getClinicById(dc.clinicId).pipe(map(c => c), catchError(() => of(null))),
            branches: this.clinicService.getClinicBranches(dc.clinicId).pipe(map(b => b), catchError(() => of([])))
          }).pipe(
            map(res => {
              if (res.clinic) {
                dc.clinicNameEn = res.clinic.nameEn;
                dc.clinicNameAr = res.clinic.nameAr;
                dc.logoUrl = res.clinic.logoUrl;
              }
              const branch = res.branches.find((b: any) => b.branchId === dc.branchId);
              dc.branchNameEn = branch ? branch.branchNameEn : 'Unknown Branch';
              dc.branchNameAr = branch ? branch.branchNameAr : 'فرع غير معروف';
              return dc;
            })
          );
        });

        forkJoin(nameRequests).subscribe({
          next: (updatedClinics) => {
            this.doctorClinics = updatedClinics;
            if (preselectDcId && this.doctorClinics.some(c => c.dcId === preselectDcId)) {
              this.selectClinic(preselectDcId);
            }
            this.uiService.hideLoading();
          },
          error: () => {
            this.doctorClinics = activeClinics;
            if (preselectDcId && this.doctorClinics.some(c => c.dcId === preselectDcId)) {
              this.selectClinic(preselectDcId);
            }
            this.uiService.hideLoading();
          }
        });
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
        this.slots = data || [];
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  // Choices Handlers
  selectDoctor(doctorId: string): void {
    this.wizardForm.patchValue({ doctorId });
    this.onDoctorChange();
    this.currentStep = 2;
  }

  selectClinic(dcId: string): void {
    this.wizardForm.patchValue({ dcId });
    this.onClinicOrDateChange();
    this.currentStep = 3;
  }

  selectDate(dateStr: string): void {
    this.wizardForm.patchValue({ scheduledDate: dateStr });
    this.onClinicOrDateChange();
  }

  selectSlot(slotId: string): void {
    this.wizardForm.patchValue({ slotId });
    this.currentStep = 4;
  }

  selectAppointmentType(type: string): void {
    this.wizardForm.patchValue({ appointmentType: type });
  }

  selectSessionType(type: string): void {
    this.wizardForm.patchValue({ sessionType: type });
  }

  goToStep(stepNum: number): void {
    // Basic validation progression
    if (stepNum > 1 && !this.wizardForm.value.doctorId) return;
    if (stepNum > 2 && !this.wizardForm.value.dcId) return;
    if (stepNum > 3 && (!this.wizardForm.value.scheduledDate || !this.wizardForm.value.slotId)) return;
    
    this.currentStep = stepNum;
  }

  // Selected summaries details helper
  getSelectedDoctor() {
    const docId = this.wizardForm.value.doctorId;
    return this.doctors.find(d => d.doctorId === docId);
  }

  getSelectedClinic() {
    const dcId = this.wizardForm.value.dcId;
    return this.doctorClinics.find(dc => dc.dcId === dcId);
  }

  getSelectedSlot() {
    const slotId = this.wizardForm.value.slotId;
    return this.slots.find(s => s.slotId === slotId);
  }

  getDoctorDisplayName(d: any): string {
    if (!d) return '';
    const name = (d.fullName || '').trim();
    const nameLower = name.toLowerCase();
    if (nameLower.startsWith('dr') || nameLower.startsWith('doctor') || nameLower.startsWith('prof') || nameLower.startsWith('consultant') || nameLower.startsWith('specialist') || nameLower.startsWith('د.')) {
      return name;
    }
    const isAr = this.langService.isArabic;
    const prefix = isAr ? 'د.' : 'Dr.';
    return `${prefix} ${name}`;
  }

  getInitials(name: string): string {
    if (!name) return 'DR';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getAvatarBg(name: string): string {
    const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return bgColors[sum % bgColors.length];
  }

  getAvatarColor(name: string): string {
    const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return textColors[sum % textColors.length];
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
        let errorMsg = 'Failed to book appointment.';
        if (err.error) {
          if (typeof err.error === 'string') {
            errorMsg = err.error;
          } else if (err.error.error) {
            errorMsg = err.error.error;
          } else if (err.error.message) {
            errorMsg = err.error.message;
          } else if (err.error.errors && Array.isArray(err.error.errors)) {
            errorMsg = err.error.errors.map((e: any) => e.defaultMessage || e.message).join(', ');
          } else {
            errorMsg = JSON.stringify(err.error);
          }
        }
        this.uiService.showError(errorMsg);
      }
    });
  }
}
