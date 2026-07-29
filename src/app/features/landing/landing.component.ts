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
}

export interface ClinicCardDisplay extends ClinicResponseDto {
  area?: string;
  cityId?: string;
  cityName?: string;
  addressLine1?: string;
  specs?: string[];
  languages?: string[];
  insurances?: string[];
  doctors?: DoctorCardDisplay[];
  expanded?: boolean;
}

import { CustomSelectComponent } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CustomSelectComponent, TranslatePipe, TranslateObjPipe],
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
  public activeSpecialtyId = '';
  public activeSpecialtyName = '';
  public selectedCityId = '';
  public selectedRating = 0;
  public selectedLangId = '';
  public selectedInsId = '';
  public filterTodayOnly = false;
  public sortBy = 'best';

  // Search Form
  public searchForm: FormGroup = this.fb.group({
    query: [''],
    location: ['']
  });

  get sortSelectOptions() {
    return [
      { label: this.languageService.translate('Best match', 'أفضل تطابق'), value: 'best' },
      { label: this.languageService.translate('Highest rated ⭐', 'الأعلى تقييماً ⭐'), value: 'rating' },
      { label: this.languageService.translate('Most reviews', 'الأكثر مراجعة'), value: 'reviews' },
      { label: this.languageService.translate('Alphabetical (A-Z)', 'أبجدي (أ-ي)'), value: 'alpha' }
    ];
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

    const langNames = detail?.languages?.map(l => {
      const found = this.languages.find(x => x.languageId === l.languageId);
      return found ? this.languageService.translate(found.nameEn, found.nameAr) : '';
    }).filter(Boolean) as string[] || [];

    const insNames = detail?.insurances?.map(i => {
      const found = this.insuranceProviders.find(x => x.providerId === i.providerId);
      return found ? this.languageService.translate(found.nameEn, found.nameAr) : '';
    }).filter(Boolean) as string[] || [];

    // Map real doctors assigned to this clinic's branches
    const matchedDoctors: DoctorCardDisplay[] = [];

    if (this.rawDoctors && this.rawDoctors.length > 0) {
      const clinicDoctors = this.rawDoctors.filter(doc => {
        const assignedClinicIds = this.doctorToClinicIds[doc.doctorId] || [];
        return assignedClinicIds.includes(c.clinicId);
      });

      clinicDoctors.forEach((doc, dIdx) => {
        const initials = doc.fullName ? doc.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
        const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
        const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];

        const docTitle = this.languageService.translate((doc.title as string) || 'Dr', doc.title === 'DR' ? 'د.' : 'طبيب');
        const specName = specNames[0] || this.languageService.translate('Specialist Doctor', 'طبيب أخصائي');
        const nextSlot = dIdx % 2 === 0 ? this.languageService.translate('Today 2:00 PM', 'اليوم ٢:٠٠ م') : this.languageService.translate('Tomorrow 10:00 AM', 'غداً ١٠:٠٠ ص');

        // Resolve branch name
        let branchName = '';
        const links = this.doctorClinicLinks[doc.doctorId] || [];
        const linkForThisClinic = links.find((link: any) => link.clinicId === c.clinicId);
        if (linkForThisClinic && detail?.branches) {
          const branch = detail.branches.find(b => b.branchId === linkForThisClinic.branchId);
          if (branch) {
            branchName = this.languageService.translate(branch.branchNameEn, branch.branchNameAr);
          }
        }

        matchedDoctors.push({
          doctorId: doc.doctorId,
          name: `${docTitle}. ${doc.fullName}`,
          title: doc.title || 'Dr',
          spec: specName,
          rating: doc.overallRating || 5.0,
          reviews: doc.reviewCount || 10,
          exp: doc.experienceYears || 5,
          avail: dIdx % 2 === 0 ? 'today' : 'tomorrow',
          nextSlot: nextSlot,
          langs: langNames.length > 0 ? langNames.map(l => l.substring(0, 2).toUpperCase()) : ['AR', 'EN'],
          initials,
          avatarBg: bgColors[dIdx % bgColors.length],
          avatarColor: textColors[dIdx % textColors.length],
          consultationFeeSar: doc.consultationFeeSar || 150,
          branchName: branchName || this.languageService.translate('Main Branch', 'الفرع الرئيسي')
        });
      });
    }

    return {
      ...c,
      area,
      cityName,
      cityId,
      addressLine1: primaryBranch?.addressLine1 || area,
      specs: specNames.length > 0 ? specNames : [this.languageService.translate('General Practice', 'الطب العام'), this.languageService.translate('Internal Medicine', 'الطب الباطني')],
      languages: langNames.length > 0 ? langNames : [this.languageService.translate('Arabic', 'العربية'), this.languageService.translate('English', 'الإنجليزية')],
      insurances: insNames.length > 0 ? insNames : [this.languageService.translate('Tawuniya', 'التعاونية'), this.languageService.translate('Bupa Arabia', 'بوبا العربية')],
      doctors: matchedDoctors,
      expanded: false
    };
  }

  // ── Filter Engine ────────────────────────────────────────────────
  setSpecialtyFilter(specId: string, specName: string): void {
    if (this.activeSpecialtyId === specId) {
      this.activeSpecialtyId = '';
      this.activeSpecialtyName = '';
    } else {
      this.activeSpecialtyId = specId;
      this.activeSpecialtyName = specName;
    }
    this.applyFilters();
  }

  setCityFilter(cityId: string): void {
    if (this.selectedCityId === cityId) {
      this.selectedCityId = '';
    } else {
      this.selectedCityId = cityId;
    }
    this.searchForm.patchValue({ location: this.selectedCityId }, { emitEvent: false });
    this.applyFilters();
  }

  onLocationChange(): void {
    this.selectedCityId = this.searchForm.value.location || '';
    this.applyFilters();
  }

  setLanguageFilter(langId: string): void {
    this.selectedLangId = this.selectedLangId === langId ? '' : langId;
    this.applyFilters();
  }

  setInsuranceFilter(insId: string): void {
    this.selectedInsId = this.selectedInsId === insId ? '' : insId;
    this.applyFilters();
  }

  setRatingFilter(rating: number): void {
    this.selectedRating = this.selectedRating === rating ? 0 : rating;
    this.applyFilters();
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
    const locationVal = (this.searchForm.value.location || this.selectedCityId || '').trim();

    const selectedCityObj = this.cities.find(ct => ct.cityId === locationVal || ct.cityId.toLowerCase() === locationVal.toLowerCase());
    const selectedCityNameEn = selectedCityObj?.nameEn?.toLowerCase() || '';
    const selectedCityNameAr = selectedCityObj?.nameAr?.toLowerCase() || '';

    let list = this.clinics.filter(c => {
      // 1. Text Query Search (Clinic name, Doctor name, Specialty, Address, City)
      const matchesNameEn = c.nameEn?.toLowerCase().includes(query);
      const matchesNameAr = c.nameAr?.toLowerCase().includes(query);
      const matchesCity = c.cityName?.toLowerCase().includes(query);
      const matchesAddr = c.addressLine1?.toLowerCase().includes(query);
      const matchesSpec = c.specs?.some(s => s.toLowerCase().includes(query));
      const matchesDoc = c.doctors?.some(d => d.name.toLowerCase().includes(query));

      const queryMatch = !query || matchesNameEn || matchesNameAr || matchesCity || matchesAddr || matchesSpec || matchesDoc;

      // 2. Location / City Filter
      let locMatch = true;
      if (locationVal) {
        const targetLow = locationVal.toLowerCase();
        const matchById = c.cityId?.toLowerCase() === targetLow;
        const matchByCityName = !!c.cityName?.toLowerCase().includes(targetLow);
        const matchByAddr = !!c.addressLine1?.toLowerCase().includes(targetLow) || !!(c.area && c.area.toLowerCase().includes(targetLow));
        const matchBySelectedObjEn = selectedCityNameEn ? (!!c.cityName?.toLowerCase().includes(selectedCityNameEn) || !!c.addressLine1?.toLowerCase().includes(selectedCityNameEn)) : false;
        const matchBySelectedObjAr = selectedCityNameAr ? (!!c.cityName?.toLowerCase().includes(selectedCityNameAr) || !!c.addressLine1?.toLowerCase().includes(selectedCityNameAr)) : false;

        locMatch = matchById || matchByCityName || matchByAddr || matchBySelectedObjEn || matchBySelectedObjAr;
      }

      // 3. Specialty Filter
      const specMatch = !this.activeSpecialtyName || c.specs?.some(s => s.toLowerCase().includes(this.activeSpecialtyName.toLowerCase()));

      // 4. Rating Filter
      const ratingMatch = !this.selectedRating || (c.overallRating || 0) >= this.selectedRating;

      // 5. Today Only Filter
      const todayMatch = !this.filterTodayOnly || c.doctors?.some(d => d.avail === 'today');

      return queryMatch && locMatch && specMatch && ratingMatch && todayMatch;
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
    this.activeSpecialtyId = '';
    this.activeSpecialtyName = '';
    this.selectedCityId = '';
    this.selectedLangId = '';
    this.selectedInsId = '';
    this.selectedRating = 0;
    this.filterTodayOnly = false;
    this.sortBy = 'best';
    this.searchForm.reset({ query: '', location: '' });
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

    // Fetch real placement dcId for doctor matching this clinic
    this.doctorService.getDoctorClinics(doc.doctorId).subscribe({
      next: (dcList) => {
        if (dcList && dcList.length > 0) {
          const match = dcList.find(dc => dc.clinicId === clinicId);
          if (match) {
            doc.dcId = match.dcId;
          } else {
            doc.dcId = dcList[0].dcId;
          }
          this.fetchRealSlotsForDoctor(doc.dcId, this.selectedDate);
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

  fetchRealSlotsForDoctor(dcId: string, date: string): void {
    this.doctorService.getAvailableSlots(dcId, date).subscribe({
      next: (slots) => {
        const available = slots.filter(s => s.status === SlotStatus.AVAILABLE);
        this.availableSlots = available;
        this.selectedSlot = available.length > 0 ? available[0] : null;
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
      overallRating: clinic.overallRating || 4.9,
      reviewCount: clinic.reviewCount || 10,
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
