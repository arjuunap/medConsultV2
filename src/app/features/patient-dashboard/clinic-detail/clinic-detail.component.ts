import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import * as L from 'leaflet';
import { ClinicService } from '../../../core/services/clinic.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { UiService } from '../../../core/services/ui.service';
import { TranslatePipe, TranslateObjPipe } from '../../../shared/pipes/translate.pipe';
import { ClinicDetailResponse, ClinicBranchResponseDto, ClinicOperatingHourResponseDto } from '../../../core/models/clinic.model';
import { DoctorResponseDto, DoctorClinicResponseDto, AppointmentSlotResponseDto } from '../../../core/models/doctor.model';
import { AppointmentType, SessionType } from '../../../core/models/appointment.model';
import { ReferenceService } from '../../../core/services/reference.service';
import { LanguageResponseDto, SpecialtyResponseDto, CityResponseDto } from '../../../core/models/reference.model';
import { ReviewService, ClinicReviewResponse } from '../../../core/services/review.service';
import { environment } from '../../../../environments/environment';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-clinic-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, TranslateObjPipe, CustomSelectComponent],
  templateUrl: './clinic-detail.component.html',
  styleUrls: ['./clinic-detail.component.css']
})
export class ClinicDetailComponent implements OnInit, OnDestroy {
  private clinicService = inject(ClinicService);
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private appointmentService = inject(AppointmentService);
  private authService = inject(AuthService);
  public languageService = inject(LanguageService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private referenceService = inject(ReferenceService);
  private reviewService = inject(ReviewService);
  public apiUrl = environment.apiUrl;

  public clinicId: string = '';
  public selectedClinic: ClinicDetailResponse | null = null;
  public clinicReviews: ClinicReviewResponse[] = [];
  public showClinicReviews = false;
  
  public viewStep: 'CLINIC_DETAIL' | 'BRANCH_DOCTORS' = 'CLINIC_DETAIL';
  public selectedBranch: ClinicBranchResponseDto | null = null;
  public branchOperatingHours: ClinicOperatingHourResponseDto[] = [];
  public branchDoctors: { doctor: DoctorResponseDto; dcLink: DoctorClinicResponseDto; qualifications: any[]; languages: any[] }[] = [];

  // General state
  public patientId = '';
  public allDoctors: DoctorResponseDto[] = [];
  public cities: CityResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];
  public doctorToBranchesMap: { [doctorId: string]: DoctorClinicResponseDto[] } = {};

  // Branch Location Modal State
  public locationModalOpen = false;
  public selectedLocationBranch: ClinicBranchResponseDto | null = null;
  private branchLocationMap: L.Map | null = null;
  private branchLocationMarker: L.Marker | null = null;

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

  public bookingForm: FormGroup = this.fb.group({
    appointmentType: [AppointmentType.NEW_PATIENT, [Validators.required]],
    sessionType: [SessionType.IN_CLINIC, [Validators.required]],
    reason: ['', [Validators.maxLength(255)]]
  });

  public isSubmittingBooking = false;
  private paramSub?: Subscription;

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

  ngOnInit(): void {
    this.loadPatientProfile();
    this.paramSub = this.route.params.subscribe(params => {
      if (params['id']) {
        this.clinicId = params['id'];
        this.loadClinicData();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.paramSub) {
      this.paramSub.unsubscribe();
    }
    if (this.branchLocationMap) {
      this.branchLocationMap.off();
      this.branchLocationMap.remove();
      this.branchLocationMap = null;
    }
  }

  loadPatientProfile(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.patientService.getMyProfile().pipe(catchError(() => of(null))).subscribe({
        next: (p) => {
          if (p) {
            this.patientId = p.patientId;
          }
        }
      });
    }
  }

  loadClinicData(): void {
    this.uiService.showLoading();
    forkJoin({
      clinicDetail: this.clinicService.getClinicDetail(this.clinicId).pipe(catchError(() => of(null))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([]))),
      cities: this.referenceService.getAllCities().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.selectedClinic = res.clinicDetail;
        this.allDoctors = res.doctors || [];
        this.cities = res.cities || [];
        this.globalLanguages = res.languages || [];

        if (!this.selectedClinic) {
          this.uiService.hideLoading();
          this.uiService.showError('Clinic not found.');
          this.router.navigate(['/patient/clinics']);
          return;
        }

        // Fetch real reviews
        this.reviewService.getClinicReviews(this.clinicId).pipe(
          catchError(() => of(null))
        ).subscribe({
          next: (revRes: any) => {
            if (revRes) {
              if (Array.isArray(revRes)) {
                this.clinicReviews = revRes;
              } else if (Array.isArray(revRes.content)) {
                this.clinicReviews = revRes.content;
              } else if (revRes.data && Array.isArray(revRes.data)) {
                this.clinicReviews = revRes.data;
              } else {
                this.clinicReviews = [];
              }
            } else {
              this.clinicReviews = [];
            }
            if (this.clinicReviews.length > 0) {
              this.showClinicReviews = true;
            }
          }
        });

        // Preload doctor links
        this.preloadDoctorLinks();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load clinic detail.');
      }
    });
  }

  preloadDoctorLinks(): void {
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
  }

  goBackToClinics(): void {
    this.router.navigate(['/patient/clinics']);
  }

  goBackToBranches(): void {
    this.viewStep = 'CLINIC_DETAIL';
    this.selectedBranch = null;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
  }

  toggleClinicReviews(): void {
    this.showClinicReviews = !this.showClinicReviews;
  }

  getBranchCityName(branch: ClinicBranchResponseDto | null): string {
    if (!branch || !branch.cityId) return 'Saudi Arabia';
    const city = this.cities.find(c => c.cityId === branch.cityId);
    return city ? (this.languageService.isArabic ? city.nameAr : city.nameEn) : 'Saudi Arabia';
  }

  getBranchAddress(branch: ClinicBranchResponseDto | null): string {
    if (!branch) return '';
    return branch.addressLine1 || branch.addressLine2 || 'Street address available upon booking';
  }

  getBranchDoctorCount(branchId: string): number {
    let count = 0;
    Object.values(this.doctorToBranchesMap).forEach(links => {
      if (links && links.some(l => l && l.isActive !== false && l.branchId === branchId)) {
        count++;
      }
    });
    return count;
  }

  selectBranch(branch: ClinicBranchResponseDto): void {
    this.selectedBranch = branch;
    this.viewStep = 'BRANCH_DOCTORS';
    this.branchDoctors = [];
    this.branchOperatingHours = [];
    this.uiService.showLoading();

    const hours$ = this.clinicService.getBranchHours(branch.branchId).pipe(catchError(() => of([])));

    hours$.subscribe({
      next: (hours) => {
        this.branchOperatingHours = hours || [];

        const docLinkCalls = this.allDoctors.map(doc => 
          this.doctorService.getDoctorClinics(doc.doctorId).pipe(
            catchError(() => of([])),
            map(links => ({ doctor: doc, links: links || [] }))
          )
        );

        if (docLinkCalls.length > 0) {
          forkJoin(docLinkCalls).subscribe({
            next: (allDocLinks) => {
              const matchedRequests: any[] = [];

              allDocLinks.forEach(item => {
                const doc = item.doctor;
                const links = item.links;
                this.doctorToBranchesMap[doc.doctorId] = links;

                const matchedLink = links.find(l => {
                  if (!l || l.isActive === false) return false;
                  if (l.branchId && l.branchId === branch.branchId) return true;
                  if (!l.branchId && l.clinicId === branch.clinicId && (this.selectedClinic?.branches?.length || 0) <= 1) return true;
                  return false;
                });

                if (matchedLink) {
                  const req = forkJoin({
                    quals: this.doctorService.getDoctorQualifications(doc.doctorId).pipe(catchError(() => of([]))),
                    langs: this.doctorService.getDoctorLanguages(doc.doctorId).pipe(catchError(() => of([])))
                  }).pipe(
                    map(res => ({
                      doctor: doc,
                      dcLink: matchedLink,
                      qualifications: res.quals || [],
                      languages: res.langs || []
                    }))
                  );
                  matchedRequests.push(req);
                }
              });

              if (matchedRequests.length > 0) {
                forkJoin(matchedRequests).subscribe({
                  next: (docs) => {
                    this.branchDoctors = docs;
                    this.uiService.hideLoading();
                  },
                  error: () => {
                    this.uiService.hideLoading();
                  }
                });
              } else {
                this.branchDoctors = [];
                this.uiService.hideLoading();
              }
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

  // Branch Location Viewer Leaflet Map Modal Logic
  hasBranchLocation(branch: ClinicBranchResponseDto | null): boolean {
    return !!(branch && branch.latitude !== undefined && branch.latitude !== null && branch.longitude !== undefined && branch.longitude !== null);
  }

  viewBranchLocation(branch: ClinicBranchResponseDto): void {
    if (!this.hasBranchLocation(branch)) return;
    this.selectedLocationBranch = branch;
    this.locationModalOpen = true;
    setTimeout(() => {
      this.initBranchLocationMap();
    }, 150);
  }

  closeBranchLocation(): void {
    this.locationModalOpen = false;
    this.selectedLocationBranch = null;
    if (this.branchLocationMap) {
      this.branchLocationMap.off();
      this.branchLocationMap.remove();
      this.branchLocationMap = null;
    }
  }

  initBranchLocationMap(): void {
    if (!this.selectedLocationBranch || !this.hasBranchLocation(this.selectedLocationBranch)) return;
    const lat = Number(this.selectedLocationBranch.latitude);
    const lng = Number(this.selectedLocationBranch.longitude);
    const container = document.getElementById('viewBranchMapDiv');
    if (!container) return;

    if (this.branchLocationMap) {
      this.branchLocationMap.off();
      this.branchLocationMap.remove();
      this.branchLocationMap = null;
    }

    this.branchLocationMap = L.map('viewBranchMapDiv', {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.branchLocationMap);

    const customPinIcon = L.divIcon({
      className: 'custom-leaflet-marker-pin',
      html: `
        <div class="marker-pin-wrapper">
          <div class="marker-pin-pulse"></div>
          <div class="marker-pin-body">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [36, 46],
      iconAnchor: [18, 44]
    });

    this.branchLocationMarker = L.marker([lat, lng], { icon: customPinIcon }).addTo(this.branchLocationMap);

    const branchName = this.languageService.isArabic ? (this.selectedLocationBranch.branchNameAr || this.selectedLocationBranch.branchNameEn) : (this.selectedLocationBranch.branchNameEn || this.selectedLocationBranch.branchNameAr);
    this.branchLocationMarker.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px;">
        <strong style="color: #0f766e; font-size: 14px;">${branchName}</strong>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${this.getBranchAddress(this.selectedLocationBranch)}</p>
      </div>
    `).openPopup();

    setTimeout(() => {
      if (this.branchLocationMap) {
        this.branchLocationMap.invalidateSize();
      }
    }, 250);
  }

  openInGoogleMaps(): void {
    if (!this.selectedLocationBranch || !this.hasBranchLocation(this.selectedLocationBranch)) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${this.selectedLocationBranch.latitude},${this.selectedLocationBranch.longitude}`;
    window.open(url, '_blank');
  }

  // Booking Modal Logic
  openBooking(doc: DoctorResponseDto, dcLink: DoctorClinicResponseDto): void {
    if (!this.authService.isLoggedIn()) {
      this.uiService.showError('Please log in to book an appointment.');
      this.router.navigate(['/login']);
      return;
    }

    this.bookingDoctor = doc;
    this.bookingDcLink = dcLink;
    this.bookingModalOpen = true;
    this.selectedSlot = null;
    this.bookingDate = new Date().toISOString().split('T')[0];
    this.generateNextDays();
    this.loadSlotsForDate(this.bookingDate);
  }

  closeBooking(): void {
    this.bookingModalOpen = false;
    this.bookingDoctor = null;
    this.bookingDcLink = null;
    this.availableSlots = [];
    this.selectedSlot = null;
  }

  generateNextDays(): void {
    this.nextDays = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      this.nextDays.push({ date: dateStr, label, dayName, hasSlots: true });
    }
  }

  selectDateChip(dateStr: string): void {
    this.bookingDate = dateStr;
    this.selectedSlot = null;
    this.loadSlotsForDate(dateStr);
  }

  loadSlotsForDate(dateStr: string): void {
    if (!this.bookingDoctor || !this.bookingDcLink) return;
    this.availableSlots = [];
    this.uiService.showLoading();

    this.doctorService.getAvailableSlots(
      this.bookingDcLink.dcId,
      dateStr
    ).pipe(catchError(() => of([]))).subscribe({
      next: (slots: AppointmentSlotResponseDto[]) => {
        this.availableSlots = (slots || []).filter((s: AppointmentSlotResponseDto) => s.status === 'AVAILABLE');
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  selectSlot(slot: AppointmentSlotResponseDto): void {
    this.selectedSlot = slot;
  }

  confirmBooking(): void {
    if (!this.selectedSlot || !this.bookingDoctor || !this.bookingDcLink) return;
    if (!this.patientId) {
      this.uiService.showError('Patient profile required to book an appointment.');
      return;
    }

    this.isSubmittingBooking = true;
    this.uiService.showLoading();

    const payload = {
      patientId: this.patientId,
      doctorId: this.bookingDoctor.doctorId,
      dcId: this.bookingDcLink.dcId,
      slotId: this.selectedSlot.slotId,
      appointmentType: this.bookingForm.value.appointmentType,
      sessionType: this.bookingForm.value.sessionType,
      reason: this.bookingForm.value.reason || 'General Consultation'
    };

    this.appointmentService.bookAppointment(payload).subscribe({
      next: () => {
        this.isSubmittingBooking = false;
        this.uiService.hideLoading();
        this.uiService.showSuccess(this.languageService.translate('Appointment booked successfully!', 'تم حجز الموعد بنجاح!'));
        this.closeBooking();
        this.router.navigate(['/patient/appointments']);
      },
      error: (err) => {
        this.isSubmittingBooking = false;
        this.uiService.hideLoading();
        this.uiService.showError(err?.error?.message || 'Failed to book appointment.');
      }
    });
  }

  getDoctorDisplayName(doc: DoctorResponseDto): string {
    if (!doc) return '';
    return this.languageService.isArabic ? ((doc as any).fullNameAr || doc.fullName) : doc.fullName;
  }

  getDaysOfWeekName(dayNum: number): string {
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const idx = (dayNum >= 1 && dayNum <= 7) ? (dayNum % 7) : 0;
    return this.languageService.isArabic ? daysAr[idx] : daysEn[idx];
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
    if (!name) return '#f1f5f9';
    const colors = ['#e0f2fe', '#dcfce7', '#fef3c7', '#f3e8ff', '#ffe4e6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  }

  getAvatarColor(name: string): string {
    if (!name) return '#0f172a';
    const colors = ['#0369a1', '#15803d', '#b45309', '#6b21a8', '#be123c'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  }
}
