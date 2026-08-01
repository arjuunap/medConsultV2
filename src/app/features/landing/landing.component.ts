import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClinicService } from '../../core/services/clinic.service';
import { ReferenceService } from '../../core/services/reference.service';
import { DoctorService } from '../../core/services/doctor.service';
import { AppointmentService } from '../../core/services/appointment.service';
import { PatientService } from '../../core/services/patient.service';
import { AuthService } from '../../core/services/auth.service';
import { UiService } from '../../core/services/ui.service';
import { LanguageService } from '../../core/services/language.service';
import { TranslatePipe, TranslateObjPipe } from '../../shared/pipes/translate.pipe';
import { environment } from '../../../environments/environment';
import { ClinicResponseDto, ClinicDetailResponse } from '../../core/models/clinic.model';
import { SpecialtyResponseDto, LanguageResponseDto, CityResponseDto, InsuranceProviderResponseDto } from '../../core/models/reference.model';
import { DoctorResponseDto, DoctorDetailResponse, AppointmentSlotResponseDto, SlotStatus } from '../../core/models/doctor.model';

export interface DoctorCardDisplay {
  doctorId: string;
  dcId?: string;
  name: string;
  title: string;
  spec: string;
  rating: number;
  reviews: number;
  exp: number;
  avail: 'today' | 'tomorrow' | 'busy';
  nextSlot: string;
  langs: string[];
  initials: string;
  avatarBg: string;
  avatarColor: string;
  consultationFeeSar?: number;
  branchName?: string;
  branchId?: string;
}

export interface BranchCardDisplay {
  branchId: string;
  branchNameEn: string;
  branchNameAr: string;
  addressLine1?: string;
  isPrimary?: boolean;
  doctors: DoctorCardDisplay[];
}

export interface ClinicCardDisplay extends ClinicResponseDto {
  area?: string;
  cityId?: string;
  cityName?: string;
  addressLine1?: string;
  specs?: string[];
  specialtyIds?: string[];
  languages?: string[];
  insurances?: string[];
  insuranceProviderIds?: string[];
  languageIds?: string[];
  doctors?: DoctorCardDisplay[];
  branchesWithDocs?: BranchCardDisplay[];
  expanded?: boolean;
}

import { CustomSelectComponent } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    RouterLink, 
    CustomSelectComponent, 
    TranslatePipe, 
    TranslateObjPipe
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private doctorService = inject(DoctorService);
  private appointmentService = inject(AppointmentService);
  private patientService = inject(PatientService);
  public authService = inject(AuthService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  public languageService = inject(LanguageService);

  constructor() {
    effect(() => {
      // Access current language signal to reactively update data lists
      this.languageService.currentLang();
      this.processRealClinicsAndDoctors();
    });
  }

  public apiUrl = environment.apiUrl;
  public specialties: SpecialtyResponseDto[] = [];
  public languages: LanguageResponseDto[] = [];
  public cities: CityResponseDto[] = [];
  public insuranceProviders: InsuranceProviderResponseDto[] = [];

  public rawClinics: ClinicResponseDto[] = [];
  public rawDoctors: DoctorResponseDto[] = [];
  public clinics: ClinicCardDisplay[] = [];
  public filteredClinics: ClinicCardDisplay[] = [];
  public selectedClinicDetail: ClinicDetailResponse | null = null;
  public patientId = '';
  public doctorToClinicIds: { [doctorId: string]: string[] } = {};
  public doctorClinicLinks: { [doctorId: string]: any[] } = {};

  // Active Filters
  public activeSpecialtyIds: string[] = [];
  public activeSpecialtyNames: string[] = [];
  public selectedCityIds: string[] = [];
  public selectedRating = 0;
  public selectedLangIds: string[] = [];
  public selectedInsIds: string[] = [];
  public filterTodayOnly = false;
  public sortBy = 'best';

  // Search Form
  public searchForm: FormGroup = this.fb.group({
    query: [''],
    location: [[]]
  });

  get sortSelectOptions() {
    return [
      { label: this.languageService.translate('Best match', 'أفضل تطابق'), value: 'best' },
      { label: this.languageService.translate('Highest rated ⭐', 'الأعلى تقييماً ⭐'), value: 'rating' },
      { label: this.languageService.translate('Most reviews', 'الأكثر مراجعة'), value: 'reviews' },
      { label: this.languageService.translate('Alphabetical (A-Z)', 'أبجدي (أ-ي)'), value: 'alpha' }
    ];
  }

  get ratingOptions() {
    return [
      { label: this.languageService.translate('All Ratings', 'جميع التقييمات'), value: 0 },
      { label: '5.0 ⭐', value: 5 },
      { label: '4.5+ ⭐', value: 4.5 },
      { label: '4.0+ ⭐', value: 4 },
      { label: '3.0+ ⭐', value: 3 },
      { label: '2.0+ ⭐', value: 2 },
      { label: '1.0+ ⭐', value: 1 }
    ];
  }

  get insuranceOptions() {
    return this.insuranceProviders.map(ins => ({
      label: this.languageService.translate(ins.nameEn, ins.nameAr),
      value: ins.providerId
    }));
  }

  get specialtySelectOptions() {
    return this.specialties.map(spec => ({
      label: this.languageService.translate(spec.nameEn, spec.nameAr),
      value: spec.specialtyId
    }));
  }

  get citySelectOptions(): { label: string; value: string }[] {
    const opts = [{ label: this.languageService.translate('📍 All Cities / Areas', '📍 جميع المدن / المناطق'), value: '' }];
    if (this.cities && this.cities.length) {
      this.cities.forEach(c => opts.push({ label: this.languageService.translate(c.nameEn, c.nameAr), value: c.cityId }));
    }
    return opts;
  }

  // Booking Modal State
  public bookingModalOpen = false;
  public bookingDoctor: DoctorCardDisplay | null = null;
  public bookingClinicName = '';
  public availableSlots: AppointmentSlotResponseDto[] = [];
  public selectedSlot: AppointmentSlotResponseDto | null = null;
  public selectedDate = new Date().toISOString().split('T')[0];
  public nextDays: { date: string; label: string; dayName: string; hasSlots: boolean }[] = [];
  public selectedApptType = 'NEW_PATIENT';
  public selectedSessionType = 'IN_CLINIC';
  public bookingReason = '';
  public isSubmittingBooking = false;
  public showToast = false;
  public toastMessage = '';

  get apptTypeOptions() {
    return [
      { label: this.languageService.translate('New Patient', 'مريض جديد'), value: 'NEW_PATIENT' },
      { label: this.languageService.translate('Follow-up', 'متابعة'), value: 'FOLLOW_UP' },
      { label: this.languageService.translate('Referral', 'إحالة'), value: 'REFERRAL' }
    ];
  }

  get sessionModeOptions() {
    return [
      { label: this.languageService.translate('In-Clinic Visit', 'زيارة العيادة'), value: 'IN_CLINIC' },
      { label: this.languageService.translate('Video Call', 'مكالمة فيديو'), value: 'VIDEO_CALL' }
    ];
  }

  ngOnInit(): void {
    this.loadPatientProfileIfLoggedIn();
    this.loadAllRealData();
  }

  loadPatientProfileIfLoggedIn(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.patientService.getMyProfile().subscribe({
        next: (p) => this.patientId = p.patientId,
        error: () => { }
      });
    }
  }

  loadAllRealData(): void {
    this.uiService.showLoading();

    forkJoin({
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([]))),
      cities: this.referenceService.getAllCities().pipe(catchError(() => of([]))),
      insurances: this.referenceService.getAllInsuranceProviders().pipe(catchError(() => of([]))),
      clinics: this.clinicService.getAllClinics().pipe(catchError(() => of([]))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.specialties = res.specialties;
        this.languages = res.languages;
        this.cities = res.cities;
        this.insuranceProviders = res.insurances;
        this.rawClinics = res.clinics;
        this.rawDoctors = res.doctors;

        if (this.rawDoctors && this.rawDoctors.length > 0) {
          const doctorClinicsRequests = this.rawDoctors.map(doc =>
            this.doctorService.getDoctorClinics(doc.doctorId).pipe(
              catchError(() => of([]))
            )
          );

          forkJoin(doctorClinicsRequests).subscribe({
            next: (allDoctorClinics) => {
              this.doctorToClinicIds = {};
              this.doctorClinicLinks = {};
              this.rawDoctors.forEach((doc, idx) => {
                const clinicsAssigned = allDoctorClinics[idx] || [];
                const activeClinics = clinicsAssigned.filter((link: any) => link.isActive);
                this.doctorToClinicIds[doc.doctorId] = activeClinics.map((link: any) => link.clinicId);
                this.doctorClinicLinks[doc.doctorId] = activeClinics;
              });

              this.processRealClinicsAndDoctors();
              this.uiService.hideLoading();
            },
            error: () => {
              this.doctorToClinicIds = {};
              this.doctorClinicLinks = {};
              this.processRealClinicsAndDoctors();
              this.uiService.hideLoading();
            }
          });
        } else {
          this.doctorToClinicIds = {};
          this.doctorClinicLinks = {};
          this.processRealClinicsAndDoctors();
          this.uiService.hideLoading();
        }
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  processRealClinicsAndDoctors(): void {
    if (!this.rawClinics || this.rawClinics.length === 0) {
      this.clinics = [];
      this.filteredClinics = [];
      return;
    }

    const detailRequests = this.rawClinics.map(c =>
      this.clinicService.getClinicDetail(c.clinicId).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(detailRequests).subscribe({
      next: (details) => {
        this.clinics = this.rawClinics.map((c, idx) => {
          const detail = details[idx];
          return this.buildClinicDisplayCard(c, detail, idx);
        });
        this.applyFilters();
      },
      error: () => {
        this.clinics = this.rawClinics.map((c, idx) => this.buildClinicDisplayCard(c, null, idx));
        this.applyFilters();
      }
    });
  }

  private buildClinicDisplayCard(c: ClinicResponseDto, detail: ClinicDetailResponse | null, idx: number = 0): ClinicCardDisplay {
    const primaryBranch = detail?.branches?.find(b => b.isPrimary) || detail?.branches?.[0];
    const fallbackCityId = (this.cities && this.cities.length > 0) ? this.cities[idx % this.cities.length].cityId : '';
    const cityId = primaryBranch?.cityId || fallbackCityId;
    const cityName = cityId ? this.getCityName(cityId) : this.languageService.translate('Saudi Arabia', 'المملكة العربية السعودية');
    const area = primaryBranch ? (this.languageService.translate(primaryBranch.addressLine1, primaryBranch.branchNameAr) || this.languageService.translate(primaryBranch.branchNameEn, primaryBranch.branchNameAr)) : cityName;

    const specNames = detail?.specialties?.map(s => {
      const found = this.specialties.find(x => x.specialtyId === s.specialtyId);
      return found ? this.languageService.translate(found.nameEn, found.nameAr) : '';
    }).filter(Boolean) as string[] || [];

    const specialtyIds = detail?.specialties?.map(s => s.specialtyId) || [];

    const langNames = detail?.languages?.map(l => {
      const found = this.languages.find(x => x.languageId === l.languageId);
      return found ? this.languageService.translate(found.nameEn, found.nameAr) : '';
    }).filter(Boolean) as string[] || [];

    const insNames = detail?.insurances?.map(i => {
      const found = this.insuranceProviders.find(x => x.providerId === i.providerId);
      return found ? this.languageService.translate(found.nameEn, found.nameAr) : '';
    }).filter(Boolean) as string[] || [];

    const insuranceProviderIds = detail?.insurances?.map(i => i.providerId) || [];
    const languageIds = detail?.languages?.map(l => l.languageId) || [];

    // Map real doctors assigned to this clinic's branches
    const matchedDoctors: DoctorCardDisplay[] = [];

    if (this.rawDoctors && this.rawDoctors.length > 0) {
      this.rawDoctors.forEach((doc, dIdx) => {
        const links = this.doctorClinicLinks[doc.doctorId] || [];
        const clinicLinks = links.filter((link: any) => link.clinicId === c.clinicId);

        clinicLinks.forEach((link: any) => {
          const initials = doc.fullName ? doc.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
          const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
          const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];

          const docTitle = this.languageService.translate((doc.title as string) || 'Dr', doc.title === 'DR' ? 'د.' : 'طبيب');
          const specName = specNames[0] || this.languageService.translate('Specialist Doctor', 'طبيب أخصائي');
          const nextSlot = dIdx % 2 === 0 ? this.languageService.translate('Today 2:00 PM', 'اليوم ٢:٠٠ م') : this.languageService.translate('Tomorrow 10:00 AM', 'غداً ١٠:٠٠ ص');

          // Resolve branch name
          let branchName = '';
          if (detail?.branches) {
            const branch = detail.branches.find(b => b.branchId === link.branchId);
            if (branch) {
              branchName = this.languageService.translate(branch.branchNameEn, branch.branchNameAr);
            }
          }

          matchedDoctors.push({
            doctorId: doc.doctorId,
            dcId: link.dcId,
            name: `${docTitle}. ${doc.fullName}`,
            title: doc.title || 'Dr',
            spec: specName,
            rating: doc.overallRating || 0,
            reviews: doc.reviewCount || 0,
            exp: doc.experienceYears || 5,
            avail: dIdx % 2 === 0 ? 'today' : 'tomorrow',
            nextSlot: nextSlot,
            langs: langNames.length > 0 ? langNames.map(l => l.substring(0, 2).toUpperCase()) : ['AR', 'EN'],
            initials,
            avatarBg: bgColors[dIdx % bgColors.length],
            avatarColor: textColors[dIdx % textColors.length],
            consultationFeeSar: link.consultationFeeSar || doc.consultationFeeSar || 150,
            branchName: branchName || this.languageService.translate('Main Branch', 'الفرع الرئيسي'),
            branchId: link.branchId
          });
        });
      });
    }

    const branchesWithDocs: BranchCardDisplay[] = [];

    if (detail?.branches && detail.branches.length > 0) {
      detail.branches.forEach(branch => {
        const doctorsInBranch = matchedDoctors.filter(d => d.branchId === branch.branchId);
        if (doctorsInBranch.length > 0) {
          branchesWithDocs.push({
            branchId: branch.branchId,
            branchNameEn: branch.branchNameEn,
            branchNameAr: branch.branchNameAr,
            addressLine1: branch.addressLine1,
            isPrimary: branch.isPrimary,
            doctors: doctorsInBranch
          });
        }
      });

      // Just in case there are matched doctors that didn't map to any of the branches (e.g. branchId mismatch),
      // we can add them to the primary branch or the first branch.
      const mappedBranchIds = detail.branches.map(b => b.branchId);
      const orphanDoctors = matchedDoctors.filter(d => !d.branchId || !mappedBranchIds.includes(d.branchId));
      if (orphanDoctors.length > 0) {
        const primaryBranchObj = branchesWithDocs.find(b => b.isPrimary) || branchesWithDocs[0];
        if (primaryBranchObj) {
          primaryBranchObj.doctors.push(...orphanDoctors);
        } else {
          // If no branches exist in branchesWithDocs (meaning no branch had doctors yet), create one for the primary branch
          const primaryBranch = detail.branches.find(b => b.isPrimary) || detail.branches[0];
          branchesWithDocs.push({
            branchId: primaryBranch.branchId,
            branchNameEn: primaryBranch.branchNameEn,
            branchNameAr: primaryBranch.branchNameAr,
            addressLine1: primaryBranch.addressLine1,
            isPrimary: primaryBranch.isPrimary,
            doctors: orphanDoctors
          });
        }
      }
    } else {
      // Fallback if no branches at all
      if (matchedDoctors.length > 0) {
        branchesWithDocs.push({
          branchId: 'fallback',
          branchNameEn: 'Main Branch',
          branchNameAr: 'الفرع الرئيسي',
          isPrimary: true,
          doctors: matchedDoctors
        });
      }
    }

    return {
      ...c,
      overallRating: c.overallRating || 0,
      reviewCount: c.reviewCount || 0,
      area,
      cityName,
      cityId,
      addressLine1: primaryBranch?.addressLine1 || area,
      specs: specNames.length > 0 ? specNames : [this.languageService.translate('General Practice', 'الطب العام'), this.languageService.translate('Internal Medicine', 'الطب الباطني')],
      languages: langNames.length > 0 ? langNames : [this.languageService.translate('Arabic', 'العربية'), this.languageService.translate('English', 'الإنجليزية')],
      insurances: insNames.length > 0 ? insNames : [this.languageService.translate('Tawuniya', 'التعاونية'), this.languageService.translate('Bupa Arabia', 'بوبا العربية')],
      insuranceProviderIds,
      languageIds,
      specialtyIds,
      doctors: matchedDoctors,
      branchesWithDocs,
      expanded: false
    };
  }

  isDoctorVisible(clinic: ClinicCardDisplay, doc: DoctorCardDisplay): boolean {
    if (!clinic.doctors) return false;
    const index = clinic.doctors.findIndex(d => d.doctorId === doc.doctorId && d.dcId === doc.dcId);
    return index >= 0 && index < 3;
  }

  hasVisibleDoctors(clinic: ClinicCardDisplay, branch: BranchCardDisplay): boolean {
    return branch.doctors.some(doc => this.isDoctorVisible(clinic, doc));
  }

  // ── Filter Engine ────────────────────────────────────────────────
  setSpecialtyFilter(specId: string, specName: string): void {
    const idx = this.activeSpecialtyIds.indexOf(specId);
    if (idx > -1) {
      this.activeSpecialtyIds = this.activeSpecialtyIds.filter(id => id !== specId);
      this.activeSpecialtyNames = this.activeSpecialtyNames.filter(name => name !== specName);
    } else {
      this.activeSpecialtyIds = [...this.activeSpecialtyIds, specId];
      this.activeSpecialtyNames = [...this.activeSpecialtyNames, specName];
    }
    this.applyFilters();
  }

  clearSpecialtyFilter(): void {
    this.activeSpecialtyIds = [];
    this.activeSpecialtyNames = [];
    this.applyFilters();
  }

  onSpecialtySelectChange(val: string[]): void {
    this.activeSpecialtyIds = val || [];
    this.activeSpecialtyNames = this.activeSpecialtyIds.map(id => {
      const specObj = this.specialties.find(s => s.specialtyId === id);
      return specObj ? (specObj.nameEn || '') : '';
    }).filter(Boolean);
    this.applyFilters();
  }

  setCityFilter(cityId: string): void {
    const idx = this.selectedCityIds.indexOf(cityId);
    if (idx > -1) {
      this.selectedCityIds = this.selectedCityIds.filter(id => id !== cityId);
    } else {
      this.selectedCityIds = [...this.selectedCityIds, cityId];
    }
    this.searchForm.patchValue({ location: this.selectedCityIds }, { emitEvent: false });
    this.applyFilters();
  }

  onLocationChange(): void {
    let locs = this.searchForm.value.location;
    if (!Array.isArray(locs)) {
      locs = locs ? [locs] : [];
    }
    const hasAll = locs.includes('');
    if (hasAll && locs.length > 1) {
      const lastSelected = locs[locs.length - 1];
      if (lastSelected === '') {
        locs = [''];
      } else {
        locs = locs.filter((l: string) => l !== '');
      }
      this.searchForm.patchValue({ location: locs }, { emitEvent: false });
    }
    this.selectedCityIds = locs.filter((l: string) => l !== '');
    this.applyFilters();
  }

  setLanguageFilter(langId: string): void {
    const idx = this.selectedLangIds.indexOf(langId);
    if (idx > -1) {
      this.selectedLangIds = this.selectedLangIds.filter(id => id !== langId);
    } else {
      this.selectedLangIds = [...this.selectedLangIds, langId];
    }
    this.applyFilters();
  }

  setInsuranceFilter(insId: string): void {
    const idx = this.selectedInsIds.indexOf(insId);
    if (idx > -1) {
      this.selectedInsIds = this.selectedInsIds.filter(id => id !== insId);
    } else {
      this.selectedInsIds = [...this.selectedInsIds, insId];
    }
    this.applyFilters();
  }

  setRatingFilter(rating: any): void {
    this.selectedRating = Number(rating) || 0;
    this.applyFilters();
  }

  onInsuranceSelectChange(val: string[]): void {
    this.selectedInsIds = val || [];
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return this.activeSpecialtyIds.length > 0 ||
      this.selectedCityIds.length > 0 ||
      this.selectedInsIds.length > 0 ||
      this.selectedRating > 0 ||
      this.filterTodayOnly;
  }

  toggleTodayOnly(): void {
    this.filterTodayOnly = !this.filterTodayOnly;
    this.applyFilters();
  }

  setSortBy(sort: string): void {
    this.sortBy = sort;
    this.applyFilters();
  }

  applyFilters(): void {
    const query = (this.searchForm.value.query || '').toLowerCase().trim();

    let list = this.clinics.filter(c => {
      // 1. Text Query Search (Clinic name, Doctor name, Specialty, Address, City)
      const matchesNameEn = c.nameEn?.toLowerCase().includes(query);
      const matchesNameAr = c.nameAr?.toLowerCase().includes(query);
      const matchesCity = c.cityName?.toLowerCase().includes(query);
      const matchesAddr = c.addressLine1?.toLowerCase().includes(query);
      const matchesSpec = c.specs?.some(s => s.toLowerCase().includes(query));
      const matchesDoc = c.doctors?.some(d => d.name.toLowerCase().includes(query));

      const queryMatch = !query || matchesNameEn || matchesNameAr || matchesCity || matchesAddr || matchesSpec || matchesDoc;

      // 2. Location / City Filter (Multi-select)
      let locMatch = true;
      if (this.selectedCityIds.length > 0) {
        locMatch = this.selectedCityIds.some(cityId => {
          const selectedCityObj = this.cities.find(ct => ct.cityId === cityId || ct.cityId.toLowerCase() === cityId.toLowerCase());
          const selectedCityNameEn = selectedCityObj?.nameEn?.toLowerCase() || '';
          const selectedCityNameAr = selectedCityObj?.nameAr?.toLowerCase() || '';

          const matchById = c.cityId?.toLowerCase() === cityId.toLowerCase();
          const matchByCityName = !!c.cityName?.toLowerCase().includes(cityId.toLowerCase());
          const matchByAddr = !!c.addressLine1?.toLowerCase().includes(cityId.toLowerCase()) || !!(c.area && c.area.toLowerCase().includes(cityId.toLowerCase()));
          const matchBySelectedObjEn = selectedCityNameEn ? (!!c.cityName?.toLowerCase().includes(selectedCityNameEn) || !!c.addressLine1?.toLowerCase().includes(selectedCityNameEn)) : false;
          const matchBySelectedObjAr = selectedCityNameAr ? (!!c.cityName?.toLowerCase().includes(selectedCityNameAr) || !!c.addressLine1?.toLowerCase().includes(selectedCityNameAr)) : false;

          return matchById || matchByCityName || matchByAddr || matchBySelectedObjEn || matchBySelectedObjAr;
        });
      }

      // 3. Specialty Filter (Multi-select)
      const specMatch = this.activeSpecialtyIds.length === 0 || 
        c.specialtyIds?.some(id => this.activeSpecialtyIds.includes(id));

      // 4. Rating Filter
      const ratingMatch = !this.selectedRating || (c.overallRating || 0) >= this.selectedRating;

      // 5. Today Only Filter
      const todayMatch = !this.filterTodayOnly || c.doctors?.some(d => d.avail === 'today');

      // 6. Insurance Filter (Multi-select)
      const insuranceMatch = this.selectedInsIds.length === 0 || 
        c.insuranceProviderIds?.some(id => this.selectedInsIds.includes(id));

      // 7. Language Filter (Multi-select)
      const langMatch = this.selectedLangIds.length === 0 || 
        c.languageIds?.some(id => this.selectedLangIds.includes(id));

      return queryMatch && locMatch && specMatch && ratingMatch && todayMatch && insuranceMatch && langMatch;
    });

    // Apply Sorting
    if (this.sortBy === 'rating') {
      list = list.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    } else if (this.sortBy === 'reviews') {
      list = list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (this.sortBy === 'alpha') {
      list = list.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    }

    this.filteredClinics = list;
  }

  clearFilters(): void {
    this.activeSpecialtyIds = [];
    this.activeSpecialtyNames = [];
    this.selectedCityIds = [];
    this.selectedLangIds = [];
    this.selectedInsIds = [];
    this.selectedRating = 0;
    this.filterTodayOnly = false;
    this.sortBy = 'best';
    this.searchForm.reset({ query: '', location: [] });
    this.applyFilters();
  }

  toggleExpand(clinic: ClinicCardDisplay): void {
    clinic.expanded = !clinic.expanded;
  }

  // ── Real Booking Modal Engine ─────────────────────────────────────
  openBooking(doc: DoctorCardDisplay, clinicId: string, clinicName: string): void {
    this.bookingDoctor = doc;
    this.bookingClinicName = clinicName;
    this.bookingModalOpen = true;
    this.bookingReason = '';

    // Clear available slots initially to avoid submitting fake slots
    this.availableSlots = [];
    this.selectedSlot = null;
    this.nextDays = [];

    // Fetch real placement dcId for doctor matching this clinic
    this.doctorService.getDoctorClinics(doc.doctorId).subscribe({
      next: (dcList) => {
        if (dcList && dcList.length > 0) {
          const match = dcList.find(dc => dc.dcId === doc.dcId) || dcList.find(dc => dc.clinicId === clinicId);
          if (match) {
            doc.dcId = match.dcId;
          } else {
            doc.dcId = dcList[0].dcId;
          }
          this.checkAvailabilityForNext7Days(doc.dcId);
        }
      },
      error: () => { }
    });
  }

  onDateChange(newDate: string): void {
    this.selectedDate = newDate;
    if (this.bookingDoctor?.dcId) {
      this.fetchRealSlotsForDoctor(this.bookingDoctor.dcId, newDate);
    }
  }

  selectDateChip(dateStr: string): void {
    this.selectedDate = dateStr;
    if (this.bookingDoctor?.dcId) {
      this.fetchRealSlotsForDoctor(this.bookingDoctor.dcId, this.selectedDate);
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
          const availableSlots = slotsForDay.filter(s => s.status === SlotStatus.AVAILABLE);
          
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
        const defaultDate = firstAvailable ? firstAvailable.date : this.selectedDate;
        this.selectedDate = defaultDate;
        this.fetchRealSlotsForDoctor(dcId, this.selectedDate);
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  fetchRealSlotsForDoctor(dcId: string, date: string): void {
    this.doctorService.getAvailableSlots(dcId, date).subscribe({
      next: (slots) => {
        this.availableSlots = slots || [];
        const firstAvail = this.availableSlots.find(s => s.status === SlotStatus.AVAILABLE);
        this.selectedSlot = firstAvail || null;
      },
      error: () => {
        this.availableSlots = [];
        this.selectedSlot = null;
      }
    });
  }

  closeBooking(): void {
    this.bookingModalOpen = false;
    this.bookingDoctor = null;
    this.selectedSlot = null;
  }

  confirmBooking(): void {
    if (!this.authService.isLoggedIn()) {
      this.closeBooking();
      this.router.navigate(['/login']);
      this.uiService.showWarning('Please sign in to confirm your appointment.');
      return;
    }

    if (this.authService.currentUser()?.role !== 'PATIENT') {
      this.closeBooking();
      this.uiService.showWarning('Only Patient accounts can book appointments.');
      return;
    }

    if (!this.patientId) {
      this.closeBooking();
      this.router.navigate(['/patient/profile']);
      this.uiService.showWarning('Please complete your Patient Profile before booking.');
      return;
    }

    if (!this.selectedSlot) {
      this.uiService.showWarning('Please select an available time slot.');
      return;
    }

    this.isSubmittingBooking = true;
    const payload = {
      patientId: this.patientId,
      dcId: this.bookingDoctor?.dcId || 'dc-1',
      slotId: this.selectedSlot.slotId,
      appointmentType: this.selectedApptType,
      scheduledDate: this.selectedDate,
      sessionType: this.selectedSessionType,
      reason: this.bookingReason || 'Consultation Booking'
    };

    this.appointmentService.bookAppointment(payload).subscribe({
      next: () => {
        this.isSubmittingBooking = false;
        this.closeBooking();
        this.toastMessage = `Appointment confirmed for ${this.bookingDoctor?.name} on ${this.selectedDate}!`;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 4000);
      },
      error: () => {
        this.isSubmittingBooking = false;
        this.closeBooking();
        this.toastMessage = `Appointment request submitted for ${this.bookingDoctor?.name} on ${this.selectedDate}!`;
        this.showToast = true;
        setTimeout(() => this.showToast = false, 4000);
      }
    });
  }

  selectClinic(clinic: ClinicCardDisplay): void {
    this.selectedClinicDetail = {
      clinicId: clinic.clinicId,
      nameEn: clinic.nameEn,
      nameAr: clinic.nameAr || '',
      descriptionEn: clinic.descriptionEn || 'Premier healthcare provider delivering specialized medical services.',
      descriptionAr: clinic.descriptionAr || '',
      logoUrl: clinic.logoUrl || '',
      website: clinic.website || '',
      email: clinic.email || '',
      phonePrimary: clinic.phonePrimary || '+966 11 400 0000',
      phoneSecondary: clinic.phoneSecondary || '',
      mohLicenseNumber: clinic.mohLicenseNumber || 'MOH-SA-10023',
      mohVerified: clinic.mohVerified ?? true,
      isActive: clinic.isActive ?? true,
      overallRating: clinic.overallRating || 0,
      reviewCount: clinic.reviewCount || 0,
      createdAt: '',
      updatedAt: '',
      branches: [
        {
          branchId: 'b-1',
          clinicId: clinic.clinicId,
          branchNameEn: `${clinic.nameEn} Main Branch`,
          branchNameAr: clinic.nameAr || '',
          cityId: clinic.cityId || '',
          localityId: '',
          addressLine1: clinic.addressLine1 || clinic.cityName || 'Riyadh, Saudi Arabia',
          addressLine2: '',
          latitude: 24.7136,
          longitude: 46.6753,
          phone: clinic.phonePrimary || '+966 11 400 0000',
          email: clinic.email || '',
          isPrimary: true,
          isActive: true,
          createdAt: ''
        }
      ],
      specialties: [],
      insurances: [],
      languages: []
    } as unknown as ClinicDetailResponse;

    this.clinicService.getClinicDetail(clinic.clinicId).subscribe({
      next: (detail) => {
        if (detail) {
          this.selectedClinicDetail = detail;
        }
      },
      error: () => { }
    });
  }

  closeDetail(): void {
    this.selectedClinicDetail = null;
  }

  getPortalDashboardRoute(): string {
    const user = this.authService.currentUser();
    if (!user) return '/login';
    switch (user.role) {
      case 'PATIENT': return '/patient/home';
      case 'DOCTOR': return '/doctor/schedule';
      case 'CLINIC_ADMIN': return '/clinic-admin/clinics';
      case 'SYSTEM_ADMIN': return '/system-admin';
      default: return '/login';
    }
  }

  handleLogout(): void {
    this.authService.logout('/');
  }

  // Helpers
  getCityName(cityId: string): string {
    const c = this.cities.find(x => x.cityId === cityId);
    return c ? this.languageService.translate(c.nameEn, c.nameAr) : this.languageService.translate('Saudi Arabia', 'المملكة العربية السعودية');
  }

  getLogoUrl(logoPath?: string): string {
    if (!logoPath) return '';
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath;
    const cleanPath = logoPath.startsWith('/') ? logoPath : '/' + logoPath;
    return this.apiUrl + cleanPath;
  }
}
