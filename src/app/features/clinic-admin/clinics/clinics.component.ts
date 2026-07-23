import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { environment } from '../../../../environments/environment';
import { ClinicResponseDto, ClinicBranchResponseDto, ClinicSpecialtyResponseDto, ClinicInsuranceResponseDto, ClinicLanguageResponseDto, ClinicOperatingHourResponseDto, ClinicOperatingHourRequestDto } from '../../../core/models/clinic.model';
import { SpecialtyResponseDto, InsuranceProviderResponseDto, CityResponseDto, LocalityResponseDto, LanguageResponseDto } from '../../../core/models/reference.model';

@Component({
  selector: 'app-clinics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './clinics.component.html',
  styleUrls: ['./clinics.component.css']
})
export class ClinicsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public apiUrl = environment.apiUrl;
  public clinics: ClinicResponseDto[] = [];
  public searchTerm: string = '';

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
  public activeModal: 'addClinic' | 'editClinic' | 'addBranch' | 'addSpecialty' | 'addInsurance' | 'addLanguage' | 'editBranchHours' | null = null;

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
    latitude: [0],
    longitude: [0],
    phone: [''],
    email: [''],
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
    return spec ? spec.nameEn : 'Unknown Specialty';
  }

  getInsuranceName(providerId: string): string {
    const ins = this.globalInsurances.find(i => i.providerId === providerId);
    return ins ? ins.nameEn : 'Unknown Provider';
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
    return lang ? lang.nameEn : 'Unknown Language';
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
  openModal(type: 'addClinic' | 'editClinic' | 'addBranch' | 'addSpecialty' | 'addInsurance' | 'addLanguage'): void {
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
      this.branchForm.reset({ isPrimary: false });
      this.branchLocalities = [];
    } else if (type === 'addSpecialty') {
      this.specialtyForm.reset();
    } else if (type === 'addInsurance') {
      this.insuranceForm.reset({ isActive: true });
    } else if (type === 'addLanguage') {
      this.languageForm.reset();
    }
  }

  closeModal(): void {
    this.activeModal = null;
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
        this.uiService.showError('Failed to update clinic.');
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

    console.log("dfdf", this.selectedClinic.clinicId)
    console.log("dfdfercfrfc", this.branchForm.value)
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
