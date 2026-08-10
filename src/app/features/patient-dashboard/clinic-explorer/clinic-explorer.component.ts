import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
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
import { ClinicResponseDto, ClinicDetailResponse, ClinicBranchResponseDto, ClinicOperatingHourResponseDto, ClinicSpecialtyResponseDto, ClinicInsuranceResponseDto } from '../../../core/models/clinic.model';
import { DoctorResponseDto, DoctorClinicResponseDto, AppointmentSlotResponseDto } from '../../../core/models/doctor.model';
import { AppointmentType, SessionType } from '../../../core/models/appointment.model';
import { ReferenceService } from '../../../core/services/reference.service';
import { LanguageResponseDto, SpecialtyResponseDto, CityResponseDto, InsuranceProviderResponseDto } from '../../../core/models/reference.model';
import { ReviewService, ClinicReviewResponse } from '../../../core/services/review.service';
import { environment } from '../../../../environments/environment';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-clinic-explorer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, TranslateObjPipe, CustomSelectComponent],
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

  // View Step Navigation State ('CLINICS_LIST' | 'CLINIC_DETAIL' | 'BRANCH_DOCTORS')
  public viewStep: 'CLINICS_LIST' | 'CLINIC_DETAIL' | 'BRANCH_DOCTORS' = 'CLINICS_LIST';

  // Branch Location Modal State
  public locationModalOpen = false;
  public selectedLocationBranch: ClinicBranchResponseDto | null = null;
  private branchLocationMap: L.Map | null = null;
  private branchLocationMarker: L.Marker | null = null;

  // General Data State
  public patientId = '';
  public clinics: ClinicResponseDto[] = [];
  public filteredClinics: ClinicResponseDto[] = [];
  public allDoctors: DoctorResponseDto[] = [];
  public doctorToBranchesMap: { [doctorId: string]: DoctorClinicResponseDto[] } = {};

  // Reference Data for Filters
  public specialties: SpecialtyResponseDto[] = [];
  public cities: CityResponseDto[] = [];
  public insuranceProviders: InsuranceProviderResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

  // Filter State
  public searchQuery = '';
  public selectedSpecialtyId = '';
  public selectedCityId = '';
  public selectedInsuranceProviderId = '';
  public showAdvancedFilters = false;
  public mobileFilterDrawerOpen = false;

  get activeFilterCount(): number {
    let count = 0;
    if (this.selectedSpecialtyId) count++;
    if (this.selectedCityId) count++;
    if (this.selectedInsuranceProviderId) count++;
    return count;
  }

  toggleMobileFilterDrawer(): void {
    this.mobileFilterDrawerOpen = !this.mobileFilterDrawerOpen;
  }

  closeMobileFilterDrawer(): void {
    this.mobileFilterDrawerOpen = false;
  }

  clearSpecialtyFilter(): void {
    this.selectedSpecialtyId = '';
    this.applyFilters();
  }

  clearCityFilter(): void {
    this.selectedCityId = '';
    this.applyFilters();
  }

  clearInsuranceFilter(): void {
    this.selectedInsuranceProviderId = '';
    this.applyFilters();
  }

  getSpecialtyName(id: string): string {
    const s = this.specialties.find(x => x.specialtyId === id);
    return s ? (this.languageService.isArabic && s.nameAr ? s.nameAr : s.nameEn) : '';
  }

  getCityName(id: string): string {
    const c = this.cities.find(x => x.cityId === id);
    return c ? (this.languageService.isArabic && c.nameAr ? c.nameAr : c.nameEn) : '';
  }

  getInsuranceName(id: string): string {
    const i = this.insuranceProviders.find(x => x.providerId === id);
    return i ? (this.languageService.isArabic && i.nameAr ? i.nameAr : i.nameEn) : '';
  }

  // Clinic Enrichment Cache (branches, specialties, insurance, cityIds per clinic)
  public clinicEnrichmentMap: {
    [clinicId: string]: {
      branches: ClinicBranchResponseDto[];
      specialties: ClinicSpecialtyResponseDto[];
      insurance: ClinicInsuranceResponseDto[];
      cityIds: string[];
    }
  } = {};

  // Selected Clinic & Branch State
  public selectedClinic: ClinicDetailResponse | null = null;
  public clinicReviews: ClinicReviewResponse[] = [];
  public showClinicReviews = false;
  public selectedBranch: ClinicBranchResponseDto | null = null;
  public branchOperatingHours: ClinicOperatingHourResponseDto[] = [];
  public branchDoctors: { doctor: DoctorResponseDto; dcLink: DoctorClinicResponseDto; qualifications: any[]; languages: any[] }[] = [];

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

  get specialtyOptions() {
    const isAr = this.languageService.isArabic;
    return [
      { label: this.languageService.translate('All Specialties', 'جميع التخصصات'), value: '' },
      ...this.specialties.map(s => ({
        label: isAr ? s.nameAr : s.nameEn,
        value: s.specialtyId
      }))
    ];
  }

  get cityOptions() {
    const isAr = this.languageService.isArabic;
    return [
      { label: this.languageService.translate('All Cities', 'جميع المدن'), value: '' },
      ...this.cities.map(c => ({
        label: isAr ? c.nameAr : c.nameEn,
        value: c.cityId
      }))
    ];
  }

  get insuranceOptions() {
    const isAr = this.languageService.isArabic;
    return [
      { label: this.languageService.translate('All Insurance Providers', 'جميع شركات التأمين'), value: '' },
      ...this.insuranceProviders.map(i => ({
        label: isAr ? i.nameAr : i.nameEn,
        value: i.providerId
      }))
    ];
  }

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
      this.patientService.getMyProfile().pipe(catchError(() => of(null))).subscribe({
        next: (p) => {
          if (p) {
            this.patientId = p.patientId;
          }
        },
        error: () => { }
      });
    }
  }

  loadInitialData(): void {
    this.uiService.showLoading();
    forkJoin({
      clinics: this.clinicService.getAllClinics().pipe(catchError(() => of([]))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([]))),
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([]))),
      cities: this.referenceService.getAllCities().pipe(catchError(() => of([]))),
      insurance: this.referenceService.getAllInsuranceProviders().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.clinics = res.clinics || [];
        this.filteredClinics = [...this.clinics];
        this.allDoctors = res.doctors || [];
        this.specialties = res.specialties || [];
        this.cities = res.cities || [];
        this.insuranceProviders = res.insurance || [];
        this.globalLanguages = res.languages || [];

        // Parallel enrich each clinic with its branches, specialties, and insurance
        if (this.clinics.length > 0) {
          const enrichRequests = this.clinics.map(c =>
            forkJoin({
              branches: this.clinicService.getClinicBranches(c.clinicId).pipe(catchError(() => of([]))),
              specialties: this.clinicService.getClinicSpecialties(c.clinicId).pipe(catchError(() => of([]))),
              insurance: this.clinicService.getClinicInsurances(c.clinicId).pipe(catchError(() => of([])))
            }).pipe(
              map(res => ({
                clinicId: c.clinicId,
                branches: res.branches || [],
                specialties: res.specialties || [],
                insurance: res.insurance || [],
                cityIds: (res.branches || []).map((b: any) => b.cityId).filter(Boolean)
              }))
            )
          );

          forkJoin(enrichRequests).subscribe({
            next: (enrichResults) => {
              this.clinicEnrichmentMap = {};
              enrichResults.forEach(item => {
                this.clinicEnrichmentMap[item.clinicId] = item;
              });
              this.preloadDoctorLinks();
            },
            error: () => {
              this.preloadDoctorLinks();
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
          this.applyFilters();
          this.uiService.hideLoading();
        },
        error: () => {
          this.applyFilters();
          this.uiService.hideLoading();
        }
      });
    } else {
      this.applyFilters();
      this.uiService.hideLoading();
    }
  }

  applyFilters(): void {
    const q = (this.searchQuery || '').toLowerCase().trim();

    this.filteredClinics = this.clinics.filter(c => {
      // 1. Search Query
      if (q) {
        const matchesName = (c.nameEn && c.nameEn.toLowerCase().includes(q)) || (c.nameAr && c.nameAr.toLowerCase().includes(q));
        const matchesDesc = (c.descriptionEn && c.descriptionEn.toLowerCase().includes(q)) || (c.descriptionAr && c.descriptionAr.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc) return false;
      }

      const enrich = this.clinicEnrichmentMap[c.clinicId];
      if (!enrich) return true;

      // 2. Specialty Filter
      if (this.selectedSpecialtyId) {
        const hasSpec = enrich.specialties && enrich.specialties.some((s: any) => s.specialtyId === this.selectedSpecialtyId);
        if (!hasSpec) return false;
      }

      // 3. City Filter
      if (this.selectedCityId) {
        const hasCity = enrich.cityIds && enrich.cityIds.includes(this.selectedCityId);
        if (!hasCity) return false;
      }

      // 4. Insurance Filter
      if (this.selectedInsuranceProviderId) {
        const hasIns = enrich.insurance && enrich.insurance.some((i: any) => i.providerId === this.selectedInsuranceProviderId);
        if (!hasIns) return false;
      }

      return true;
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedSpecialtyId = '';
    this.selectedCityId = '';
    this.selectedInsuranceProviderId = '';
    this.applyFilters();
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

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  selectClinic(clinic: ClinicResponseDto): void {
    this.router.navigate(['/patient/clinics', clinic.clinicId]);
  }

  toggleClinicReviews(): void {
    this.showClinicReviews = !this.showClinicReviews;
  }

  goBackToClinics(): void {
    this.viewStep = 'CLINICS_LIST';
    this.selectedClinic = null;
    this.selectedBranch = null;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
  }

  goBackToBranches(): void {
    this.viewStep = 'CLINIC_DETAIL';
    this.selectedBranch = null;
    this.branchDoctors = [];
    this.branchOperatingHours = [];
  }

  selectBranch(branch: ClinicBranchResponseDto): void {
    this.selectedBranch = branch;
    this.viewStep = 'BRANCH_DOCTORS';
    this.branchDoctors = [];
    this.branchOperatingHours = [];
    this.uiService.showLoading();

    // Fetch operating hours for this branch
    const hours$ = this.clinicService.getBranchHours(branch.branchId).pipe(catchError(() => of([])));

    hours$.subscribe({
      next: (hours) => {
        this.branchOperatingHours = hours || [];

        // Fetch/ensure doctor clinic links for all doctors dynamically
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
                // Also update local cache for helper counts
                this.doctorToBranchesMap[doc.doctorId] = links;

                // Strict match by branchId (or fallback to clinicId ONLY if link has no branchId & clinic has 1 branch)
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
        } else {
          this.uiService.hideLoading();
        }
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  getBranchDoctorCount(branchId: string): number {
    let count = 0;
    this.allDoctors.forEach(doc => {
      const links = this.doctorToBranchesMap[doc.doctorId] || [];
      const hasLink = links.some(l => {
        if (!l || l.isActive === false) return false;
        if (l.branchId && l.branchId === branchId) return true;
        if (!l.branchId && l.clinicId === this.selectedClinic?.clinicId && (this.selectedClinic?.branches?.length || 0) <= 1) return true;
        return false;
      });
      if (hasLink) count++;
    });
    return count;
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
      this.router.navigate(['/patient/profile'], { queryParams: { scrollTo: 'medical' } });
      return;
    }

    // Redirect directly to the Book Appointment tab with pre-filled doctor & clinic!
    this.router.navigate(['/patient/book-appointment'], {
      queryParams: {
        doctorId: doctor.doctorId,
        dcId: dcLink.dcId
      }
    });
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
    this.doctorService.getAvailableSlots(dcId, date).pipe(catchError(() => of([]))).subscribe({
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

  // ── Branch Location Viewer Methods ─────────────────────────────
  hasBranchLocation(branch: ClinicBranchResponseDto | null | undefined): boolean {
    if (!branch) return false;
    const lat = branch.latitude;
    const lng = branch.longitude;
    if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) return false;
    if (numLat === 0 && numLng === 0) return false; // Avoid 0,0 default location
    return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
  }

  viewBranchLocation(branch: ClinicBranchResponseDto): void {
    if (!this.hasBranchLocation(branch)) {
      this.uiService.showWarning(this.languageService.translate('Location coordinates are not available for this branch.', 'إحداثيات الموقع غير متوفرة لهذا الفرع.'));
      return;
    }

    this.selectedLocationBranch = branch;
    this.locationModalOpen = true;

    setTimeout(() => {
      this.initBranchLocationMap(branch);
    }, 100);
  }

  private createCustomMarkerIcon(isDraggable = false): L.DivIcon {
    return L.divIcon({
      className: 'custom-leaflet-marker-wrapper',
      html: `
        <div class="custom-leaflet-pin ${isDraggable ? 'is-draggable' : ''}">
          <div class="pin-ring-pulse"></div>
          <div class="pin-badge">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="pin-shadow"></div>
        </div>
      `,
      iconSize: [36, 46],
      iconAnchor: [18, 46],
      popupAnchor: [0, -42]
    });
  }

  private initBranchLocationMap(branch: ClinicBranchResponseDto): void {
    this.cleanupBranchLocationMap();

    const container = document.getElementById('viewBranchMapDiv');
    if (!container) return;

    const lat = Number(branch.latitude);
    const lng = Number(branch.longitude);

    try {
      this.branchLocationMap = L.map(container, {
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
      }).addTo(this.branchLocationMap);

      const customIcon = this.createCustomMarkerIcon(false);

      this.branchLocationMarker = L.marker([lat, lng], {
        draggable: false, // Read-only marker
        icon: customIcon
      }).addTo(this.branchLocationMap);

      const branchName = this.languageService.isArabic ? (branch.branchNameAr || branch.branchNameEn) : (branch.branchNameEn || branch.branchNameAr);
      if (branchName) {
        this.branchLocationMarker.bindPopup(`<b>${branchName}</b>`).openPopup();
      }

      setTimeout(() => {
        if (this.branchLocationMap) {
          this.branchLocationMap.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.error('Failed to initialize branch location map', err);
      this.uiService.showError(this.languageService.translate('Unable to load branch location map.', 'تعذر تحميل خريطة موقع الفرع.'));
      this.closeBranchLocation();
    }
  }

  closeBranchLocation(): void {
    this.cleanupBranchLocationMap();
    this.selectedLocationBranch = null;
    this.locationModalOpen = false;
  }

  private cleanupBranchLocationMap(): void {
    if (this.branchLocationMap) {
      this.branchLocationMap.off();
      this.branchLocationMap.remove();
      this.branchLocationMap = null;
    }
    this.branchLocationMarker = null;
  }

  openInGoogleMaps(): void {
    if (!this.selectedLocationBranch || !this.hasBranchLocation(this.selectedLocationBranch)) return;
    const lat = Number(this.selectedLocationBranch.latitude);
    const lng = Number(this.selectedLocationBranch.longitude);
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
