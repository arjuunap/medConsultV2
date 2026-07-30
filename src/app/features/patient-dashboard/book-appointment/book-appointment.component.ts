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
import { forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, TranslatePipe],
  templateUrl: './book-appointment.component.html',
  styleUrls: ['./book-appointment.component.css']
})
export class BookAppointmentComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
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
    if (!this.doctorSearchQuery) return this.doctors;
    const q = this.doctorSearchQuery.toLowerCase().trim();
    return this.doctors.filter(d => 
      d.fullName.toLowerCase().includes(q) || 
      (d.bioEn && d.bioEn.toLowerCase().includes(q)) ||
      (d.bioAr && d.bioAr.toLowerCase().includes(q))
    );
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
        
        // Read optional doctorId query parameter
        this.route.queryParams.subscribe(params => {
          const docId = params['doctorId'];
          if (docId && this.doctors.some(d => d.doctorId === docId)) {
            this.wizardForm.patchValue({ doctorId: docId });
            this.onDoctorChange();
            this.currentStep = 2; // Auto advance to step 2 directly
          }
        });

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
            this.uiService.hideLoading();
          },
          error: () => {
            this.doctorClinics = activeClinics;
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
    const title = d.title || 'Dr';
    const name = d.fullName || '';
    const nameLower = name.toLowerCase().trim();
    if (nameLower.startsWith('dr') || nameLower.startsWith('prof') || nameLower.startsWith('consultant')) {
      return name;
    }
    const translatedTitle = this.langService.translate(title, title === 'DR' ? 'د.' : 'طبيب');
    return `${translatedTitle ? translatedTitle + '. ' : ''}${name}`;
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
