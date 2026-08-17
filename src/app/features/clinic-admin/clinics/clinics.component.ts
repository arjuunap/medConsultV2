import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { environment } from '../../../../environments/environment';
import { ClinicResponseDto, ClinicBranchResponseDto, ClinicSpecialtyResponseDto, ClinicInsuranceResponseDto, ClinicLanguageResponseDto, ClinicOperatingHourResponseDto, ClinicOperatingHourRequestDto } from '../../../core/models/clinic.model';
import { SpecialtyResponseDto, InsuranceProviderResponseDto, CityResponseDto, LocalityResponseDto, LanguageResponseDto } from '../../../core/models/reference.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-clinics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, TranslatePipe],
  templateUrl: './clinics.component.html',
  styleUrls: ['./clinics.component.css']
})
export class ClinicsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  public languageService = inject(LanguageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private pendingClinicId: string | null = null;
  private pendingAction: string | null = null;
  private pendingBranchId: string | null = null;

  // Leaflet Map state for Branch Location Picker
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  public mapSearchQuery: string = '';
  public isSearchingLocation: boolean = false;
  public searchResults: any[] = [];
  public searchError: string | null = null;

  public apiUrl = environment.apiUrl;
  public clinics: ClinicResponseDto[] = [];
  public searchTerm: string = '';

  get citySelectOptions() {
    return this.globalCities.map(c => ({
      label: this.languageService.isArabic ? c.nameAr : c.nameEn,
      value: c.cityId
    }));
  }

  get localitySelectOptions() {
    return this.branchLocalities.map(loc => ({
      label: this.languageService.isArabic ? loc.nameAr : loc.nameEn,
      value: loc.localityId
    }));
  }

  get specialtyLinkSelectOptions() {
    return this.globalSpecialties.map(s => ({
      label: this.languageService.isArabic ? s.nameAr : s.nameEn,
      value: s.specialtyId
    }));
  }

  get insuranceLinkSelectOptions() {
    return this.globalInsurances.map(ins => ({
      label: this.languageService.isArabic ? ins.nameAr : ins.nameEn,
      value: ins.providerId
    }));
  }

  get languageLinkSelectOptions() {
    return this.globalLanguages.map(l => ({
      label: this.languageService.isArabic ? l.nameAr : l.nameEn,
      value: l.languageId
    }));
  }

  get filteredClinics(): ClinicResponseDto[] {
    if (!this.searchTerm.trim()) return this.clinics;
    const term = this.searchTerm.toLowerCase();
    return this.clinics.filter(c =>
      c.nameEn?.toLowerCase().includes(term) ||
      c.nameAr?.toLowerCase().includes(term) ||
      c.mohLicenseNumber?.toLowerCase().includes(term)
    );
  }

  public selectedClinic: ClinicResponseDto | null = null;
  public branches: ClinicBranchResponseDto[] = [];
  public clinicSpecialties: ClinicSpecialtyResponseDto[] = [];
  public clinicInsurances: ClinicInsuranceResponseDto[] = [];
  public clinicLanguages: ClinicLanguageResponseDto[] = [];

  // References list
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalInsurances: InsuranceProviderResponseDto[] = [];
  public globalCities: CityResponseDto[] = [];
  public branchLocalities: LocalityResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

  // Editing states / Modals
  public activeSubTab: 'branches' | 'specialties' | 'insurances' | 'languages' = 'branches';
  public activeModal: 'addClinic' | 'editClinic' | 'addBranch' | 'editBranch' | 'addSpecialty' | 'addInsurance' | 'addLanguage' | 'editBranchHours' | null = null;
  public selectedBranchToEdit: ClinicBranchResponseDto | null = null;

  // Forms
  public clinicForm: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    descriptionEn: [''],
    descriptionAr: [''],
    email: ['', [Validators.email]],
    phonePrimary: ['', [Validators.required]],
    phoneSecondary: [''],
    mohLicenseNumber: ['', [Validators.required]],
    vatNumber: ['']
  });
  public selectedLogoFile: File | null = null;

  public branchForm: FormGroup = this.fb.group({
    branchNameEn: ['', [Validators.required]],
    branchNameAr: ['', [Validators.required]],
    cityId: ['', [Validators.required]],
    localityId: ['', [Validators.required]],
    addressLine1: ['', [Validators.required]],
    addressLine2: [''],
    latitude: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    phone: [''],
    email: ['', [Validators.email]],
    isPrimary: [false],
  });

  public specialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', [Validators.required]]
  });

  public insuranceForm: FormGroup = this.fb.group({
    providerId: ['', [Validators.required]],
    networkClass: ['', [Validators.required]],
    isActive: [true]
  });

  public languageForm: FormGroup = this.fb.group({
    languageId: ['', [Validators.required]]
  });

  public selectedBranchForHours: ClinicBranchResponseDto | null = null;
  public branchHoursFormList: ClinicOperatingHourRequestDto[] = [];
  public branchHoursMap: { [branchId: string]: ClinicOperatingHourResponseDto[] } = {};
  public expandedBranchScheduleId: string | null = null;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'].toLowerCase();
        if (tab === 'branches' || tab === 'specialties' || tab === 'insurances' || tab === 'languages') {
          this.activeSubTab = tab;
        } else if (tab === 'hours') {
          this.activeSubTab = 'branches';
          this.pendingAction = 'hours';
        }
      }

      if (params['clinicId']) {
        this.pendingClinicId = params['clinicId'];
        if (this.clinics.length > 0) {
          const target = this.clinics.find(c => c.clinicId === params['clinicId']);
          if (target && (!this.selectedClinic || this.selectedClinic.clinicId !== target.clinicId)) {
            this.selectedClinic = target;
            this.loadClinicDetails();
          }
        }
      }

      if (params['branchId']) {
        this.pendingBranchId = params['branchId'];
      }

      if (params['action']) {
        this.pendingAction = params['action'];
      }

      this.processPendingActions();
    });

    this.loadClinics();
    this.loadGlobalReferences();
  }

  private processPendingActions(): void {
    if (!this.pendingAction) return;

    if (this.pendingAction === 'hours') {
      this.activeSubTab = 'branches';
      if (this.branches.length > 0) {
        this.expandedBranchScheduleId = this.pendingBranchId || this.branches[0].branchId;
      }
    } else if (this.pendingAction === 'addBranch') {
      this.activeSubTab = 'branches';
      this.openModal('addBranch');
    } else if (this.pendingAction === 'addSpecialty') {
      this.activeSubTab = 'specialties';
      this.openModal('addSpecialty');
    } else if (this.pendingAction === 'addInsurance') {
      this.activeSubTab = 'insurances';
      this.openModal('addInsurance');
    } else if (this.pendingAction === 'addLanguage') {
      this.activeSubTab = 'languages';
      this.openModal('addLanguage');
    } else if (this.pendingAction === 'addClinic') {
      this.openModal('addClinic');
    }
  }

  loadClinics(): void {
    this.uiService.showLoading();
    this.clinicService.getAllClinics().subscribe({
      next: (data) => {
        this.clinics = data;
        this.uiService.hideLoading();
        if (data.length > 0) {
          let target = data[0];
          if (this.pendingClinicId) {
            const found = data.find(c => c.clinicId === this.pendingClinicId);
            if (found) {
              target = found;
            }
          }
          this.selectClinic(target);
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadGlobalReferences(): void {
    this.referenceService.getAllSpecialties().subscribe({
      next: (data) => this.globalSpecialties = data
    });
    this.referenceService.getAllInsuranceProviders().subscribe({
      next: (data) => this.globalInsurances = data
    });
    this.referenceService.getAllCities().subscribe({
      next: (data) => this.globalCities = data
    });
    this.referenceService.getAllLanguages().subscribe({
      next: (data) => this.globalLanguages = data
    });
  }

  selectClinic(clinic: ClinicResponseDto): void {
    this.selectedClinic = clinic;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { clinicId: clinic.clinicId },
      queryParamsHandling: 'merge'
    });
    this.loadClinicDetails();
  }

  loadClinicDetails(): void {
    if (!this.selectedClinic) return;
    const id = this.selectedClinic.clinicId;

    this.uiService.showLoading();
    this.clinicService.getClinicBranches(id).subscribe({
      next: (data) => {
        this.branches = data;
        this.loadAllBranchHours();
        if (this.pendingAction === 'hours' && data.length > 0) {
          this.expandedBranchScheduleId = this.pendingBranchId || data[0].branchId;
        }
      }
    });
    this.clinicService.getClinicSpecialties(id).subscribe({
      next: (data) => this.clinicSpecialties = data
    });
    this.clinicService.getClinicInsurances(id).subscribe({
      next: (data) => {
        this.clinicInsurances = data;
      }
    });
    this.clinicService.getClinicLanguages(id).subscribe({
      next: (data) => {
        this.clinicLanguages = data;
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadAllBranchHours(): void {
    for (const b of this.branches) {
      this.clinicService.getBranchHours(b.branchId).subscribe({
        next: (hours) => {
          this.branchHoursMap[b.branchId] = hours;
        }
      });
    }
  }

  toggleScheduleExpand(branchId: string): void {
    this.expandedBranchScheduleId = this.expandedBranchScheduleId === branchId ? null : branchId;
  }

  getBranchHoursList(branchId: string): ClinicOperatingHourResponseDto[] {
    const hours = this.branchHoursMap[branchId] || [];
    const days = [0, 1, 2, 3, 4, 5, 6];
    return days.map(day => {
      const existing = hours.find(h => Number(h.dayOfWeek) === day);
      return existing || {
        hoursId: '',
        branchId: branchId,
        dayOfWeek: day,
        isClosed: day === 5,
        openTime: '08:00:00',
        closeTime: '22:00:00',
        breakStart: '',
        breakEnd: '',
        notes: ''
      };
    });
  }

  getDayName(dayOfWeek: number): { en: string; ar: string } {
    switch (Number(dayOfWeek)) {
      case 0: return { en: 'Sunday', ar: 'الأحد' };
      case 1: return { en: 'Monday', ar: 'الإثنين' };
      case 2: return { en: 'Tuesday', ar: 'الثلاثاء' };
      case 3: return { en: 'Wednesday', ar: 'الأربعاء' };
      case 4: return { en: 'Thursday', ar: 'الخميس' };
      case 5: return { en: 'Friday', ar: 'الجمعة' };
      case 6: return { en: 'Saturday', ar: 'السبت' };
      default: return { en: 'Day', ar: 'يوم' };
    }
  }

  getBranchStatus(branchId: string): { isOpen: boolean; labelEn: string; labelAr: string; badgeClass: string; currentHoursText: string } {
    const hours = this.branchHoursMap[branchId];
    if (!hours || hours.length === 0) {
      return {
        isOpen: false,
        labelEn: 'Hours Not Configured',
        labelAr: 'لم تحدد ساعات العمل',
        badgeClass: 'badge-secondary',
        currentHoursText: 'N/A'
      };
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday ... 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    const todayHour = hours.find(h => Number(h.dayOfWeek) === currentDay);
    if (!todayHour || todayHour.isClosed || !todayHour.openTime || !todayHour.closeTime) {
      return {
        isOpen: false,
        labelEn: 'Closed Today',
        labelAr: 'مغلق اليوم',
        badgeClass: 'badge-danger',
        currentHoursText: 'Closed'
      };
    }

    const openClean = todayHour.openTime.substring(0, 5);
    const closeClean = todayHour.closeTime.substring(0, 5);

    // Check break time
    if (todayHour.breakStart && todayHour.breakEnd) {
      const breakStartClean = todayHour.breakStart.substring(0, 5);
      const breakEndClean = todayHour.breakEnd.substring(0, 5);
      if (currentTimeStr >= breakStartClean && currentTimeStr < breakEndClean) {
        return {
          isOpen: false,
          labelEn: `On Break (until ${breakEndClean})`,
          labelAr: `استراحة (حتى ${breakEndClean})`,
          badgeClass: 'badge-warning',
          currentHoursText: `${openClean} - ${closeClean}`
        };
      }
    }

    if (currentTimeStr >= openClean && currentTimeStr < closeClean) {
      return {
        isOpen: true,
        labelEn: `Open (until ${closeClean})`,
        labelAr: `مفتوح (حتى ${closeClean})`,
        badgeClass: 'badge-success',
        currentHoursText: `${openClean} - ${closeClean}`
      };
    } else if (currentTimeStr < openClean) {
      return {
        isOpen: false,
        labelEn: `Closed (Opens at ${openClean})`,
        labelAr: `مغلق (يفتح عند ${openClean})`,
        badgeClass: 'badge-secondary',
        currentHoursText: `${openClean} - ${closeClean}`
      };
    } else {
      return {
        isOpen: false,
        labelEn: 'Closed for the day',
        labelAr: 'مغلق لباقي اليوم',
        badgeClass: 'badge-secondary',
        currentHoursText: `${openClean} - ${closeClean}`
      };
    }
  }

  getCityName(cityId: string): string {
    const c = this.globalCities.find(x => x.cityId === cityId);
    if (!c) return '';
    return this.languageService.isArabic ? c.nameAr : c.nameEn;
  }

  getLocalityName(localityId: string): string {
    const l = this.branchLocalities.find(x => x.localityId === localityId);
    if (!l) return '';
    return this.languageService.isArabic ? l.nameAr : l.nameEn;
  }

  switchSubTab(tab: 'branches' | 'specialties' | 'insurances' | 'languages'): void {
    this.activeSubTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });
  }

  // ── Specialty and Insurance Name Mappers ──────────────────────────
  getSpecialtyName(specialtyId: string): string {
    const spec = this.globalSpecialties.find(s => s.specialtyId === specialtyId);
    if (!spec) return 'Unknown Specialty';
    return this.languageService.isArabic ? spec.nameAr : spec.nameEn;
  }

  getInsuranceName(providerId: string): string {
    const ins = this.globalInsurances.find(i => i.providerId === providerId);
    if (!ins) return 'Unknown Provider';
    return this.languageService.isArabic ? ins.nameAr : ins.nameEn;
  }

  getLogoUrl(path: string | undefined | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${cleanPath}`;
  }

  getInsuranceLogoUrl(providerId: string): string {
    const ins = this.globalInsurances.find(i => i.providerId === providerId);
    return ins?.logoUrl ? this.getLogoUrl(ins.logoUrl) : '';
  }

  getLanguageName(languageId: string): string {
    const lang = this.globalLanguages.find(l => l.languageId === languageId);
    if (!lang) return 'Unknown Language';
    return this.languageService.isArabic ? lang.nameAr : lang.nameEn;
  }

  onCitySelectChange(cityId: any): void {
    const id = typeof cityId === 'string' ? cityId : (cityId?.value || '');
    this.branchForm.patchValue({ localityId: '' });
    if (id) {
      this.uiService.showLoading();
      this.referenceService.getLocalities(id).subscribe({
        next: (data) => {
          this.branchLocalities = data;
          this.uiService.hideLoading();
        },
        error: () => {
          this.branchLocalities = [];
          this.uiService.hideLoading();
        }
      });
    } else {
      this.branchLocalities = [];
    }
  }

  // ── Modal Actions ──────────────────────────────────────────────────
  openModal(type: 'addClinic' | 'editClinic' | 'addBranch' | 'editBranch' | 'addSpecialty' | 'addInsurance' | 'addLanguage'): void {
    this.activeModal = type;
    this.selectedLogoFile = null;

    if (type === 'addClinic') {
      this.clinicForm.reset();
    } else if (type === 'editClinic' && this.selectedClinic) {
      this.clinicForm.patchValue({
        nameEn: this.selectedClinic.nameEn || '',
        nameAr: this.selectedClinic.nameAr || '',
        descriptionEn: this.selectedClinic.descriptionEn || '',
        descriptionAr: this.selectedClinic.descriptionAr || '',
        email: this.selectedClinic.email || '',
        phonePrimary: this.selectedClinic.phonePrimary || '',
        phoneSecondary: this.selectedClinic.phoneSecondary || '',
        mohLicenseNumber: this.selectedClinic.mohLicenseNumber || '',
        vatNumber: this.selectedClinic.vatNumber || (this.selectedClinic as any).vat_number || ''
      });
    } else if (type === 'addBranch') {
      this.selectedBranchToEdit = null;
      this.branchForm.reset({ isPrimary: false, latitude: null, longitude: null, phone: '', email: '' });
      this.branchLocalities = [];
      this.mapSearchQuery = '';
      this.searchResults = [];
      this.searchError = null;
      setTimeout(() => {
        this.initLeafletMap();
      }, 100);
    } else if (type === 'addSpecialty') {
      this.specialtyForm.reset();
    } else if (type === 'addInsurance') {
      this.insuranceForm.reset({ isActive: true });
    } else if (type === 'addLanguage') {
      this.languageForm.reset();
    }
  }

  openEditBranchModal(branch: ClinicBranchResponseDto): void {
    this.selectedBranchToEdit = branch;
    this.activeModal = 'editBranch';

    this.branchForm.patchValue({
      branchNameEn: branch.branchNameEn || '',
      branchNameAr: branch.branchNameAr || '',
      cityId: branch.cityId || '',
      localityId: branch.localityId || '',
      addressLine1: branch.addressLine1 || '',
      addressLine2: branch.addressLine2 || '',
      latitude: (branch.latitude !== null && branch.latitude !== undefined) ? Number(branch.latitude) : null,
      longitude: (branch.longitude !== null && branch.longitude !== undefined) ? Number(branch.longitude) : null,
      phone: branch.phone || '',
      email: branch.email || '',
      isPrimary: branch.isPrimary || false
    });

    if (branch.cityId) {
      this.referenceService.getLocalities(branch.cityId).subscribe({
        next: (data) => this.branchLocalities = data,
        error: () => this.branchLocalities = []
      });
    } else {
      this.branchLocalities = [];
    }

    this.mapSearchQuery = '';
    this.searchResults = [];
    this.searchError = null;

    setTimeout(() => {
      this.initLeafletMap();
    }, 100);
  }

  closeModal(): void {
    this.destroyLeafletMap();
    this.selectedBranchToEdit = null;
    this.activeModal = null;
  }

  // ── Leaflet Interactive Map Logic ──────────────────────────────
  private destroyLeafletMap(): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
  }

  private createCustomMarkerIcon(isDraggable = true): L.DivIcon {
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

  private initLeafletMap(): void {
    this.destroyLeafletMap();

    const mapContainer = document.getElementById('branchMapDiv');
    if (!mapContainer) return;

    // Default center for Saudi Arabia (Riyadh: 24.7136, 46.6753)
    const defaultLat = 24.7136;
    const defaultLng = 46.6753;

    const currentLat = this.branchForm.get('latitude')?.value;
    const currentLng = this.branchForm.get('longitude')?.value;

    const initialLat = (currentLat !== null && currentLat !== undefined) ? currentLat : defaultLat;
    const initialLng = (currentLng !== null && currentLng !== undefined) ? currentLng : defaultLng;

    this.map = L.map(mapContainer, {
      zoomControl: true,
      fadeAnimation: true,
      zoomAnimation: true
    }).setView([initialLat, initialLng], 13);

    // High-definition CartoDB Voyager tiles for executive modern UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
    }).addTo(this.map);

    const customIcon = this.createCustomMarkerIcon(true);

    if (currentLat !== null && currentLng !== null && currentLat !== undefined && currentLng !== undefined) {
      this.marker = L.marker([currentLat, currentLng], {
        draggable: true,
        icon: customIcon
      }).addTo(this.map);

      this.marker.on('dragend', () => {
        const pos = this.marker?.getLatLng();
        if (pos) {
          this.updateMarkerPosition(pos.lat, pos.lng);
        }
      });
    }

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.updateMarkerPosition(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 200);
  }

  private updateMarkerPosition(lat: number, lng: number): void {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    this.branchForm.patchValue({
      latitude: roundedLat,
      longitude: roundedLng
    });
    this.branchForm.markAsDirty();
    this.branchForm.markAsTouched();

    if (this.map) {
      const customIcon = this.createCustomMarkerIcon(true);
      if (this.marker) {
        this.marker.setLatLng([roundedLat, roundedLng]);
      } else {
        this.marker = L.marker([roundedLat, roundedLng], {
          draggable: true,
          icon: customIcon
        }).addTo(this.map);

        this.marker.on('dragend', () => {
          const pos = this.marker?.getLatLng();
          if (pos) {
            this.updateMarkerPosition(pos.lat, pos.lng);
          }
        });
      }
      this.map.panTo([roundedLat, roundedLng]);
    }
  }

  private searchDebounceTimeout: any = null;

  public onMapSearchInputChange(): void {
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
    if (!this.mapSearchQuery || this.mapSearchQuery.trim().length < 2) {
      this.searchResults = [];
      this.searchError = null;
      this.isSearchingLocation = false;
      return;
    }
    this.searchDebounceTimeout = setTimeout(() => {
      this.performLiveMapSearch(this.mapSearchQuery);
    }, 350);
  }

  private async fetchGeocodingResults(query: string): Promise<Array<{ display_name: string; lat: number; lon: number; subtitle?: string }>> {
    const rawQuery = query.trim();
    if (!rawQuery) return [];
    const encodedQuery = encodeURIComponent(rawQuery);
    const lang = this.languageService.isArabic ? 'ar' : 'en';
    const results: Array<{ display_name: string; lat: number; lon: number; subtitle?: string }> = [];

    // Provider 1: Photon Geocoder (OSM-based, high performance, global + local with fuzzy tolerance)
    try {
      const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodedQuery}&limit=10&lang=${lang}`);
      if (photonRes.ok) {
        const data = await photonRes.json();
        if (data && data.features && data.features.length > 0) {
          for (const f of data.features) {
            const p = f.properties || {};
            const name = p.name || p.street || p.city || p.district || '';
            const subParts = [p.district, p.city, p.state, p.country].filter(Boolean);
            const subtitle = subParts.filter(s => s !== name).join(', ');
            const coords = f.geometry?.coordinates;
            if (coords && coords.length >= 2) {
              results.push({
                display_name: name ? (subtitle ? `${name}, ${subtitle}` : name) : subtitle,
                lat: Number(coords[1]),
                lon: Number(coords[0]),
                subtitle: subtitle
              });
            }
          }
          if (results.length > 0) return results;
        }
      }
    } catch (e) {
      console.warn('Photon geocoding failed, trying fallback provider...', e);
    }

    // Provider 2: Open-Meteo Geocoding API (Fast worldwide cities, towns, administrative areas, completely unrestricted CORS)
    try {
      const meteoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodedQuery}&count=10&language=${lang}&format=json`);
      if (meteoRes.ok) {
        const data = await meteoRes.json();
        if (data && data.results && data.results.length > 0) {
          for (const item of data.results) {
            const subParts = [item.admin2, item.admin1, item.country].filter(Boolean);
            const subtitle = subParts.join(', ');
            results.push({
              display_name: `${item.name}${subtitle ? ', ' + subtitle : ''}`,
              lat: Number(item.latitude),
              lon: Number(item.longitude),
              subtitle: subtitle
            });
          }
          if (results.length > 0) return results;
        }
      }
    } catch (e) {
      console.warn('Open-Meteo geocoding failed, trying Nominatim fallback...', e);
    }

    // Provider 3: OpenStreetMap Nominatim with proper contact and format params
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=10&addressdetails=1&email=medconsult-app@local.dev`;
      const nomRes = await fetch(nominatimUrl, { headers: { 'Accept-Language': lang } });
      if (nomRes.ok) {
        const data: any[] = await nomRes.json();
        if (data && data.length > 0) {
          for (const item of data) {
            results.push({
              display_name: item.display_name,
              lat: parseFloat(item.lat),
              lon: parseFloat(item.lon)
            });
          }
          if (results.length > 0) return results;
        }
      }
    } catch (e) {
      console.warn('Nominatim geocoding failed:', e);
    }

    return results;
  }

  public async performLiveMapSearch(queryText: string): Promise<void> {
    if (!queryText || !queryText.trim()) return;
    this.isSearchingLocation = true;
    this.searchError = null;

    try {
      const results = await this.fetchGeocodingResults(queryText);
      this.isSearchingLocation = false;
      if (results.length > 0) {
        this.searchResults = results;
      } else {
        this.searchResults = [];
        this.searchError = this.languageService.translate(
          'No locations found matching your query. Try searching by city, district, or landmark name.',
          'لم يتم العثور على موقع مطابق. جرب البحث باسم المدينة أو الحي أو المعلم.'
        );
      }
    } catch (e) {
      this.isSearchingLocation = false;
      this.searchResults = [];
      this.searchError = this.languageService.translate(
        'Failed to search location. Please try again.',
        'فشل البحث عن الموقع. يرجى المحاولة مرة أخرى.'
      );
    }
  }

  public async searchMapLocation(): Promise<void> {
    if (this.searchDebounceTimeout) {
      clearTimeout(this.searchDebounceTimeout);
    }
    if (!this.mapSearchQuery || !this.mapSearchQuery.trim()) return;

    this.isSearchingLocation = true;
    this.searchError = null;

    try {
      const results = await this.fetchGeocodingResults(this.mapSearchQuery);
      this.isSearchingLocation = false;
      if (results.length > 0) {
        this.searchResults = results;
        const top = results[0];
        this.selectSearchResult(top.lat, top.lon);
      } else {
        this.searchResults = [];
        this.searchError = this.languageService.translate(
          'No locations found matching your query. Try searching by city, district, or landmark name.',
          'لم يتم العثور على موقع مطابق. جرب البحث باسم المدينة أو الحي أو المعلم.'
        );
      }
    } catch (e) {
      this.isSearchingLocation = false;
      this.searchResults = [];
      this.searchError = this.languageService.translate(
        'Failed to search location. Please try again.',
        'فشل البحث عن الموقع. يرجى المحاولة مرة أخرى.'
      );
    }
  }

  public selectSearchResult(lat: number, lng: number): void {
    this.searchResults = [];
    if (this.map) {
      this.map.setView([lat, lng], 15);
    }
    this.updateMarkerPosition(lat, lng);
  }

  public useCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.uiService.showError(this.languageService.translate('Geolocation is not supported by your browser.', 'خدمة تحديد الموقع غير مدعومة في متصفحك.'));
      return;
    }

    this.uiService.showLoading();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.uiService.hideLoading();
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (this.map) {
          this.map.setView([lat, lng], 16);
        }
        this.updateMarkerPosition(lat, lng);
        this.uiService.showSuccess(this.languageService.translate('Location set to your current position.', 'تم تحديد الموقع الحالي بنجاح.'));
      },
      (error) => {
        this.uiService.hideLoading();
        let msgEn = 'Failed to get current location.';
        let msgAr = 'فشل في الحصول على الموقع الحالي.';
        if (error.code === error.PERMISSION_DENIED) {
          msgEn = 'Location permission denied by user.';
          msgAr = 'تم رفض إذن الوصول إلى الموقع من قبل المستخدم.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msgEn = 'Location information is unavailable.';
          msgAr = 'معلومات الموقع غير متوفرة.';
        } else if (error.code === error.TIMEOUT) {
          msgEn = 'Location request timed out.';
          msgAr = 'انتهت مهلة طلب تحديد الموقع.';
        }
        this.uiService.showError(this.languageService.translate(msgEn, msgAr));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // ── Forms Submission ────────────────────────────────────────────────
  onLogoSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedLogoFile = target.files[0];
    }
  }

  submitClinicUpdate(): void {
    if (this.clinicForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

    const payload = {
      ...this.clinicForm.value,
      vatNumber: this.clinicForm.value.vatNumber || ''
    };

    this.clinicService.updateClinic(this.selectedClinic.clinicId, payload, this.selectedLogoFile || undefined).subscribe({
      next: () => {
        this.uiService.hideLoading();
        if (this.selectedClinic) {
          this.selectedClinic.vatNumber = payload.vatNumber;
        }
        this.uiService.showSuccess(this.languageService.translate('Clinic profile updated successfully.', 'تم تحديث الملف الشخصي للعيادة بنجاح.'));
        this.closeModal();
        this.loadClinics();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError(this.languageService.translate('Failed to update clinic profile.', 'فشل تحديث ملف العيادة.'));
      }
    });
  }

  submitClinic(): void {
    if (this.clinicForm.invalid) return;
    this.uiService.showLoading();

    this.clinicService.createClinic(this.clinicForm.value, this.selectedLogoFile || undefined).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess(this.languageService.translate('Clinic created successfully.', 'تم إنشاء العيادة بنجاح.'));
        this.closeModal();
        this.loadClinics();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError(this.languageService.translate('Failed to create clinic.', 'فشل إنشاء العيادة.'));
      }
    });
  }

  submitBranch(): void {
    if (this.branchForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

    if (this.activeModal === 'editBranch' && this.selectedBranchToEdit) {
      this.clinicService.updateClinicBranch(this.selectedBranchToEdit.branchId, this.branchForm.value).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Branch updated successfully.', 'تم تحديث الفرع بنجاح.'));
          this.closeModal();
          this.loadClinicDetails();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError(this.languageService.translate('Failed to update branch.', 'فشل تحديث الفرع.'));
        }
      });
    } else {
      this.clinicService.createClinicBranch(this.selectedClinic.clinicId, this.branchForm.value).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Branch created successfully.', 'تم إنشاء الفرع بنجاح.'));
          this.closeModal();
          this.loadClinicDetails();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError(this.languageService.translate('Failed to create branch.', 'فشل إنشاء الفرع.'));
        }
      });
    }
  }

  submitSpecialty(): void {
    if (this.specialtyForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

    this.clinicService.addClinicSpecialty(this.selectedClinic.clinicId, this.specialtyForm.value.specialtyId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty linked to clinic.');
        this.closeModal();
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to link specialty.');
      }
    });
  }

  submitInsurance(): void {
    if (this.insuranceForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

    const providerId = this.insuranceForm.value.providerId;
    const payload = {
      providerId: providerId,
      networkClass: this.insuranceForm.value.networkClass,
      isActive: this.insuranceForm.value.isActive
    };

    this.clinicService.addClinicInsurance(this.selectedClinic.clinicId, providerId, payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Insurance provider associated.');
        this.closeModal();
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to link insurance.');
      }
    });
  }

  submitLanguage(): void {
    if (this.languageForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

    this.clinicService.addClinicLanguage(this.selectedClinic.clinicId, this.languageForm.value.languageId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language linked to clinic.');
        this.closeModal();
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to link language.');
      }
    });
  }

  // ── Branch Hours ──────────────────────────────────────────────────
  openEditHoursModal(branch: ClinicBranchResponseDto): void {
    this.selectedBranchForHours = branch;
    this.activeModal = 'editBranchHours';
    this.uiService.showLoading();

    this.clinicService.getBranchHours(branch.branchId).subscribe({
      next: (hours) => {
        // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        const days = [0, 1, 2, 3, 4, 5, 6];
        this.branchHoursFormList = days.map(day => {
          const existing = hours.find(h => Number(h.dayOfWeek) === day);
          return {
            branchId: branch.branchId,
            dayOfWeek: day,
            isClosed: existing ? Boolean(existing.isClosed) : (day === 5), // default Friday closed if unconfigured
            openTime: existing?.openTime ? existing.openTime.substring(0, 5) : '08:00',
            closeTime: existing?.closeTime ? existing.closeTime.substring(0, 5) : '22:00',
            breakStart: existing?.breakStart ? existing.breakStart.substring(0, 5) : '',
            breakEnd: existing?.breakEnd ? existing.breakEnd.substring(0, 5) : '',
            notes: existing?.notes || ''
          };
        });
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load branch hours.');
      }
    });
  }

  applyHoursPreset(preset: 'standard' | '24_7' | 'business'): void {
    if (preset === 'standard') {
      // Sun - Thu: 08:00 - 22:00, Fri: Closed, Sat: 09:00 - 17:00
      this.branchHoursFormList.forEach(h => {
        if (h.dayOfWeek >= 0 && h.dayOfWeek <= 4) {
          h.isClosed = false;
          h.openTime = '08:00';
          h.closeTime = '22:00';
          h.breakStart = '';
          h.breakEnd = '';
        } else if (h.dayOfWeek === 5) {
          h.isClosed = true;
          h.openTime = '';
          h.closeTime = '';
          h.breakStart = '';
          h.breakEnd = '';
        } else if (h.dayOfWeek === 6) {
          h.isClosed = false;
          h.openTime = '09:00';
          h.closeTime = '17:00';
          h.breakStart = '';
          h.breakEnd = '';
        }
      });
    } else if (preset === '24_7') {
      this.branchHoursFormList.forEach(h => {
        h.isClosed = false;
        h.openTime = '00:00';
        h.closeTime = '23:59';
        h.breakStart = '';
        h.breakEnd = '';
      });
    } else if (preset === 'business') {
      // Sun - Thu: 09:00 - 17:00, Fri - Sat: Closed
      this.branchHoursFormList.forEach(h => {
        if (h.dayOfWeek >= 0 && h.dayOfWeek <= 4) {
          h.isClosed = false;
          h.openTime = '09:00';
          h.closeTime = '17:00';
          h.breakStart = '';
          h.breakEnd = '';
        } else {
          h.isClosed = true;
          h.openTime = '';
          h.closeTime = '';
          h.breakStart = '';
          h.breakEnd = '';
        }
      });
    }
  }

  submitBranchHours(): void {
    if (!this.selectedBranchForHours) return;
    this.uiService.showLoading();

    const dtos: ClinicOperatingHourRequestDto[] = this.branchHoursFormList.map(h => ({
      branchId: this.selectedBranchForHours!.branchId,
      dayOfWeek: h.dayOfWeek,
      isClosed: Boolean(h.isClosed),
      openTime: (!h.isClosed && h.openTime) ? (h.openTime.length === 5 ? `${h.openTime}:00` : h.openTime) : '00:00:00',
      closeTime: (!h.isClosed && h.closeTime) ? (h.closeTime.length === 5 ? `${h.closeTime}:00` : h.closeTime) : '00:00:00',
      breakStart: (!h.isClosed && h.breakStart) ? (h.breakStart.length === 5 ? `${h.breakStart}:00` : h.breakStart) : undefined,
      breakEnd: (!h.isClosed && h.breakEnd) ? (h.breakEnd.length === 5 ? `${h.breakEnd}:00` : h.breakEnd) : undefined,
      notes: h.notes || undefined
    }));

    this.clinicService.updateBranchHours(this.selectedBranchForHours.branchId, dtos).subscribe({
      next: (updatedHours) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Branch hours updated successfully.');
        this.branchHoursMap[this.selectedBranchForHours!.branchId] = updatedHours;
        this.closeModal();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to update branch hours.');
      }
    });
  }

  // ── Removals ────────────────────────────────────────────────────────
  deleteBranch(branchId: string): void {
    if (!confirm('Are you sure you want to remove this branch?')) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicBranch(branchId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Branch removed.');
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to delete branch.');
      }
    });
  }

  deleteSpecialty(specialtyId: string): void {
    if (!confirm('Are you sure you want to unlink this specialty?')) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicSpecialty(this.selectedClinic!.clinicId, specialtyId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty unlinked.');
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to unlink specialty.');
      }
    });
  }

  deleteInsurance(providerId: string): void {
    if (!confirm('Are you sure you want to unlink this insurance provider?')) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicInsurance(this.selectedClinic!.clinicId, providerId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Insurance unlinked.');
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to unlink insurance.');
      }
    });
  }

  deleteLanguage(languageId: string): void {
    if (!confirm('Are you sure you want to unlink this language?')) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicLanguage(this.selectedClinic!.clinicId, languageId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language unlinked.');
        this.loadClinicDetails();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to unlink language.');
      }
    });
  }
}
