import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { ClinicResponseDto, ClinicBranchResponseDto, ClinicSpecialtyResponseDto, ClinicInsuranceResponseDto } from '../../../core/models/clinic.model';
import { SpecialtyResponseDto, InsuranceProviderResponseDto, CityResponseDto, LocalityResponseDto } from '../../../core/models/reference.model';

@Component({
  selector: 'app-clinics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clinics.component.html',
  styleUrls: []
})
export class ClinicsComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public clinics: ClinicResponseDto[] = [];
  public selectedClinic: ClinicResponseDto | null = null;
  public branches: ClinicBranchResponseDto[] = [];
  public clinicSpecialties: ClinicSpecialtyResponseDto[] = [];
  public clinicInsurances: ClinicInsuranceResponseDto[] = [];

  // References list
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalInsurances: InsuranceProviderResponseDto[] = [];
  public globalCities: CityResponseDto[] = [];
  public branchLocalities: LocalityResponseDto[] = [];

  // Editing states / Modals
  public activeSubTab: 'branches' | 'specialties' | 'insurances' = 'branches';
  public activeModal: 'editClinic' | 'addBranch' | 'addSpecialty' | 'addInsurance' | null = null;

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
    isPrimary: [false]
  });

  public specialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', [Validators.required]]
  });

  public insuranceForm: FormGroup = this.fb.group({
    providerId: ['', [Validators.required]],
    networkClass: ['', [Validators.required]],
    isActive: [true]
  });

  ngOnInit(): void {
    this.loadClinics();
    this.loadGlobalReferences();
  }

  loadClinics(): void {
    this.uiService.showLoading();
    this.clinicService.getAllClinics().subscribe({
      next: (data) => {
        this.clinics = data;
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
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  switchSubTab(tab: 'branches' | 'specialties' | 'insurances'): void {
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
  openModal(type: 'editClinic' | 'addBranch' | 'addSpecialty' | 'addInsurance'): void {
    this.activeModal = type;
    this.selectedLogoFile = null;

    if (type === 'editClinic' && this.selectedClinic) {
      this.clinicForm.patchValue(this.selectedClinic);
    } else if (type === 'addBranch') {
      this.branchForm.reset({ isPrimary: false });
      this.branchLocalities = [];
    } else if (type === 'addSpecialty') {
      this.specialtyForm.reset();
    } else if (type === 'addInsurance') {
      this.insuranceForm.reset({ isActive: true });
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

    this.clinicService.updateClinic(this.selectedClinic.clinicId, this.clinicForm.value, this.selectedLogoFile || undefined).subscribe({
      next: () => {
        this.uiService.hideLoading();
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

  submitBranch(): void {
    if (this.branchForm.invalid || !this.selectedClinic) return;
    this.uiService.showLoading();

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
}
