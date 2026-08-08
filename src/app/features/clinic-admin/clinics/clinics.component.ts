import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
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
  public branchHours: ClinicOperatingHourResponseDto[] = [];
  // For simplicity, we can use an array of form groups inside a form array, or just an array of objects for ngModel
  public branchHoursFormList: ClinicOperatingHourRequestDto[] = [];

  clinicId: string = ''
  ngOnInit(): void {
    this.loadClinics();
    this.loadGlobalReferences();
  }

  loadClinics(): void {
    this.uiService.showLoading();
    this.clinicService.getAllClinics().subscribe({
      next: (data) => {
        this.clinics = data;
        // console.log(data[0])
        // this.clinicId= data[0].clinicId
        console.log(this.clinicId)
        this.uiService.hideLoading();
        if (data.length > 0) {
          this.selectClinic(data[0]);
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
    this.loadClinicDetails();
  }

  loadClinicDetails(): void {
    if (!this.selectedClinic) return;
    const id = this.selectedClinic.clinicId;

    this.uiService.showLoading();
    this.clinicService.getClinicBranches(id).subscribe({
      next: (data) => this.branches = data
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

  switchSubTab(tab: 'branches' | 'specialties' | 'insurances' | 'languages'): void {
    this.activeSubTab = tab;
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

  onCityChange(event: any): void {
    const cityId = event.target.value;
    if (cityId) {
      this.uiService.showLoading();
      this.referenceService.getLocalities(cityId).subscribe({
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
      this.branchForm.get('localityId')?.setValue('');
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

    this.map = L.map(mapContainer).setView([initialLat, initialLng], 12);

    // Requirement 13: OpenStreetMap tile attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    const customIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

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

    // Requirement 9: Invalidate size after modal renders
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
      if (this.marker) {
        this.marker.setLatLng([roundedLat, roundedLng]);
      } else {
        const customIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });

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

  public searchMapLocation(): void {
    if (!this.mapSearchQuery || !this.mapSearchQuery.trim()) return;

    this.isSearchingLocation = true;
    this.searchError = null;
    this.searchResults = [];

    const query = encodeURIComponent(this.mapSearchQuery.trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5&countrycodes=sa`;

    fetch(url, {
      headers: {
        'Accept-Language': this.languageService.isArabic ? 'ar' : 'en'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Search request failed');
        return res.json();
      })
      .then((data: any[]) => {
        this.isSearchingLocation = false;
        if (data && data.length > 0) {
          this.searchResults = data;
          const top = data[0];
          this.selectSearchResult(parseFloat(top.lat), parseFloat(top.lon));
        } else {
          this.searchError = this.languageService.translate('No locations found matching your query.', 'لم يتم العثور على موقع مطابق للبحث.');
        }
      })
      .catch(() => {
        this.isSearchingLocation = false;
        this.searchError = this.languageService.translate('Failed to search location. Please try again.', 'فشل البحث عن الموقع. يرجى المحاولة مرة أخرى.');
      });
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
        let msg = 'Failed to get current location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied by user.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        this.uiService.showError(this.languageService.translate(msg, msg));
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
        this.uiService.showSuccess('Clinic profile updated successfully.');
        this.closeModal();
        this.loadClinics();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('already exists.');
      }
    });
  }

  submitClinic(): void {
    if (this.clinicForm.invalid) return;
    this.uiService.showLoading();

    this.clinicService.createClinic(this.clinicForm.value, this.selectedLogoFile || undefined).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Clinic created successfully.');
        this.closeModal();
        this.loadClinics();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to create clinic.');
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
          this.uiService.showSuccess('Branch updated successfully.');
          this.closeModal();
          this.loadClinicDetails();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Failed to update branch.');
        }
      });
    } else {
      this.clinicService.createClinicBranch(this.selectedClinic.clinicId, this.branchForm.value).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Branch created successfully.');
          this.closeModal();
          this.loadClinicDetails();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Failed to create branch.');
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
        // Initialize 7 days if empty
        const days = [1, 2, 3, 4, 5, 6, 7];
        this.branchHoursFormList = days.map(day => {
          const existing = hours.find(h => h.dayOfWeek === day);
          return {
            branchId: branch.branchId,
            dayOfWeek: day,
            isClosed: existing ? existing.isClosed : false,
            openTime: existing?.openTime || '09:00',
            closeTime: existing?.closeTime || '17:00',
            breakStart: existing?.breakStart || '',
            breakEnd: existing?.breakEnd || '',
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

  submitBranchHours(): void {
    if (!this.selectedBranchForHours) return;
    this.uiService.showLoading();

    // ensure time formatting is hh:mm, if empty use null
    const dtos = this.branchHoursFormList.map(h => ({
      ...h,
      openTime: h.openTime ? (h.openTime.length === 5 ? h.openTime + ':00' : h.openTime) : null,
      closeTime: h.closeTime ? (h.closeTime.length === 5 ? h.closeTime + ':00' : h.closeTime) : null,
      breakStart: h.breakStart ? (h.breakStart.length === 5 ? h.breakStart + ':00' : h.breakStart) : null,
      breakEnd: h.breakEnd ? (h.breakEnd.length === 5 ? h.breakEnd + ':00' : h.breakEnd) : null,
    })) as any[];

    this.clinicService.updateBranchHours(this.selectedBranchForHours.branchId, dtos).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Branch hours updated successfully.');
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
