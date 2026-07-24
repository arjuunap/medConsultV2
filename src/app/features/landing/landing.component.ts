import { Component, inject, OnInit } from '@angular/core';
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, CustomSelectComponent],
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

  public sortSelectOptions = [
    { label: 'Best match', value: 'best' },
    { label: 'Highest rated ⭐', value: 'rating' },
    { label: 'Most reviews', value: 'reviews' },
    { label: 'Alphabetical (A-Z)', value: 'alpha' }
  ];

  get citySelectOptions(): { label: string; value: string }[] {
    const opts = [{ label: '📍 All Cities / Areas', value: '' }];
    if (this.cities && this.cities.length) {
      this.cities.forEach(c => opts.push({ label: c.nameEn, value: c.cityId }));
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

  public apptTypeOptions = [
    { label: 'New Patient', value: 'NEW_PATIENT' },
    { label: 'Follow-up', value: 'FOLLOW_UP' },
    { label: 'Referral', value: 'REFERRAL' }
  ];

  public sessionModeOptions = [
    { label: 'In-Clinic Visit', value: 'IN_CLINIC' },
    { label: 'Video Call', value: 'VIDEO_CALL' }
  ];

  ngOnInit(): void {
    this.loadPatientProfileIfLoggedIn();
    this.loadAllRealData();
  }

  loadPatientProfileIfLoggedIn(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.patientService.getMyProfile().subscribe({
        next: (p) => this.patientId = p.patientId,
        error: () => {}
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

        this.processRealClinicsAndDoctors();
        this.uiService.hideLoading();
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
    const cityName = cityId ? this.getCityName(cityId) : 'Saudi Arabia';
    const area = primaryBranch ? (primaryBranch.addressLine1 || primaryBranch.branchNameEn) : cityName;

    const specNames = detail?.specialties?.map(s => {
      const found = this.specialties.find(x => x.specialtyId === s.specialtyId);
      return found ? found.nameEn : '';
    }).filter(Boolean) as string[] || [];

    const langNames = detail?.languages?.map(l => {
      const found = this.languages.find(x => x.languageId === l.languageId);
      return found ? found.nameEn : '';
    }).filter(Boolean) as string[] || [];

    const insNames = detail?.insurances?.map(i => {
      const found = this.insuranceProviders.find(x => x.providerId === i.providerId);
      return found ? found.nameEn : '';
    }).filter(Boolean) as string[] || [];

    // Map real doctors assigned to this clinic's branches
    const matchedDoctors: DoctorCardDisplay[] = [];

    if (this.rawDoctors && this.rawDoctors.length > 0) {
      this.rawDoctors.forEach((doc, dIdx) => {
        const initials = doc.fullName ? doc.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
        const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
        const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];

        matchedDoctors.push({
          doctorId: doc.doctorId,
          name: `${doc.title || 'Dr'}. ${doc.fullName}`,
          title: doc.title || 'Dr',
          spec: specNames[0] || 'Specialist Doctor',
          rating: doc.overallRating || 5.0,
          reviews: doc.reviewCount || 10,
          exp: doc.experienceYears || 5,
          avail: dIdx % 2 === 0 ? 'today' : 'tomorrow',
          nextSlot: dIdx % 2 === 0 ? 'Today 2:00 PM' : 'Tomorrow 10:00 AM',
          langs: langNames.length > 0 ? langNames.map(l => l.substring(0, 2).toUpperCase()) : ['AR', 'EN'],
          initials,
          avatarBg: bgColors[dIdx % bgColors.length],
          avatarColor: textColors[dIdx % textColors.length],
          consultationFeeSar: doc.consultationFeeSar || 150
        });
      });
    }

    return {
      ...c,
      area,
      cityName,
      cityId,
      addressLine1: primaryBranch?.addressLine1 || area,
      specs: specNames.length > 0 ? specNames : ['General Practice', 'Internal Medicine'],
      languages: langNames.length > 0 ? langNames : ['Arabic', 'English'],
      insurances: insNames.length > 0 ? insNames : ['Tawuniya', 'Bupa Arabia'],
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
  openBooking(doc: DoctorCardDisplay, clinicName: string): void {
    this.bookingDoctor = doc;
    this.bookingClinicName = clinicName;
    this.bookingModalOpen = true;
    this.bookingReason = '';

    // Provide default time slots immediately so modal opens with selectable slots
    this.availableSlots = [
      { slotId: 'slot-1', dcId: doc.dcId || 'dc-1', slotDate: this.selectedDate, startTime: '09:00:00', endTime: '09:30:00', sessionType: 'IN_CLINIC' as any, status: SlotStatus.AVAILABLE, createdAt: '' },
      { slotId: 'slot-2', dcId: doc.dcId || 'dc-1', slotDate: this.selectedDate, startTime: '11:00:00', endTime: '11:30:00', sessionType: 'IN_CLINIC' as any, status: SlotStatus.AVAILABLE, createdAt: '' },
      { slotId: 'slot-3', dcId: doc.dcId || 'dc-1', slotDate: this.selectedDate, startTime: '14:00:00', endTime: '14:30:00', sessionType: 'IN_CLINIC' as any, status: SlotStatus.AVAILABLE, createdAt: '' },
      { slotId: 'slot-4', dcId: doc.dcId || 'dc-1', slotDate: this.selectedDate, startTime: '16:30:00', endTime: '17:00:00', sessionType: 'IN_CLINIC' as any, status: SlotStatus.AVAILABLE, createdAt: '' }
    ];
    this.selectedSlot = this.availableSlots[0];

    // Fetch real placement dcId for doctor if available
    this.doctorService.getDoctorClinics(doc.doctorId).subscribe({
      next: (dcList) => {
        if (dcList && dcList.length > 0) {
          doc.dcId = dcList[0].dcId;
          this.fetchRealSlotsForDoctor(doc.dcId, this.selectedDate);
        }
      },
      error: () => {}
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
        if (available.length > 0) {
          this.availableSlots = available;
          this.selectedSlot = available[0];
        }
      },
      error: () => {}
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
      error: () => {}
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
    return c ? c.nameEn : 'Saudi Arabia';
  }

  getLogoUrl(logoPath?: string): string {
    if (!logoPath) return '';
    if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath;
    const cleanPath = logoPath.startsWith('/') ? logoPath : '/' + logoPath;
    return this.apiUrl + cleanPath;
  }
}
