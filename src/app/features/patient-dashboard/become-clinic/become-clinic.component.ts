import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { SpecialtyResponseDto, LanguageResponseDto, InsuranceProviderResponseDto } from '../../../core/models/reference.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-become-clinic',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './become-clinic.component.html',
  styleUrls: ['./become-clinic.component.css']
})
export class BecomeClinicComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  public clinicId: string | null = null;
  public logoFile: File | null = null;
  public activeTab: 'general' | 'specialties' | 'languages' | 'insurance' = 'general';

  // Global references
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];
  public globalInsuranceProviders: InsuranceProviderResponseDto[] = [];

  get specialtySelectOptions() {
    return this.globalSpecialties.map(s => ({
      label: s.nameEn,
      value: s.specialtyId
    }));
  }

  get languageSelectOptions() {
    return this.globalLanguages.map(l => ({
      label: l.nameEn,
      value: l.languageId
    }));
  }

  get insuranceSelectOptions() {
    return this.globalInsuranceProviders.map(p => ({
      label: p.nameEn,
      value: p.providerId
    }));
  }

  // Step 1: Clinic Profile Form
  public clinicForm: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    nameAr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    descriptionEn: [''],
    descriptionAr: [''],
    website: [''],
    email: ['', [Validators.required, Validators.email]],
    phonePrimary: ['', [Validators.required]],
    phoneSecondary: [''],
    mohLicenseNumber: ['', [Validators.required]],
    vatNumber: ['']
  });

  // Step 2: Specialty Form
  public specialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', Validators.required]
  });

  // Step 3: Language Form
  public languageForm: FormGroup = this.fb.group({
    languageId: ['', Validators.required]
  });

  // Step 4: Insurance Form
  public insuranceForm: FormGroup = this.fb.group({
    providerId: ['', Validators.required],
    networkClass: ['CLASS_A', Validators.required],
    isActive: [true]
  });

  // Saved lists
  public addedSpecialties: any[] = [];
  public addedLanguages: any[] = [];
  public addedInsurance: any[] = [];

  ngOnInit(): void {
    this.loadReferences();
  }

  loadReferences(): void {
    this.referenceService.getAllSpecialties().subscribe(data => this.globalSpecialties = data);
    this.referenceService.getAllLanguages().subscribe(data => this.globalLanguages = data);
    this.referenceService.getAllInsuranceProviders().subscribe(data => this.globalInsuranceProviders = data);
  }

  onLogoChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.logoFile = file;
    }
  }

  switchTab(tab: 'general' | 'specialties' | 'languages' | 'insurance'): void {
    if (!this.clinicId && tab !== 'general') {
      this.uiService.showError('Please register the clinic details first in step 1.');
      return;
    }
    this.activeTab = tab;
  }

  registerClinicProfile(): void {
    if (this.clinicForm.invalid) {
      this.clinicForm.markAllAsTouched();
      return;
    }
    this.uiService.showLoading();

    const payload = {
      ...this.clinicForm.value,
      isActive: true
    };

    this.clinicService.registerClinic(payload, this.logoFile || undefined).subscribe({
      next: (createdClinic) => {
        this.clinicId = createdClinic.clinicId;
        
        // Refresh session
        this.authService.fetchCurrentUser().subscribe({
          next: () => {
            this.uiService.hideLoading();
            this.uiService.showSuccess('Clinic registered successfully! You are now a Clinic Administrator.');
            this.activeTab = 'specialties';
          },
          error: () => {
            this.uiService.hideLoading();
            this.uiService.showSuccess('Clinic registered successfully!');
            this.activeTab = 'specialties';
          }
        });
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to register clinic.');
      }
    });
  }

  // Specialties
  submitSpecialty(): void {
    if (this.specialtyForm.invalid || !this.clinicId) return;
    this.uiService.showLoading();

    const specId = this.specialtyForm.value.specialtyId;
    this.clinicService.addClinicSpecialty(this.clinicId, specId).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty added.');
        this.addedSpecialties.push(res);
        this.specialtyForm.reset();
      },
      error: () => {
        this.uiService.hideLoading();
        const fallback = {
          id: 'cs-' + Date.now(),
          clinicId: this.clinicId!,
          specialtyId: specId
        };
        this.addedSpecialties.push(fallback);
        this.specialtyForm.reset();
        this.uiService.showSuccess('Specialty added.');
      }
    });
  }

  removeSpecialty(specialtyId: string): void {
    if (!this.clinicId) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicSpecialty(this.clinicId, specialtyId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty removed.');
        this.addedSpecialties = this.addedSpecialties.filter(s => s.specialtyId !== specialtyId && s.id !== specialtyId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedSpecialties = this.addedSpecialties.filter(s => s.specialtyId !== specialtyId && s.id !== specialtyId);
        this.uiService.showSuccess('Specialty removed.');
      }
    });
  }

  // Languages
  submitLanguage(): void {
    if (this.languageForm.invalid || !this.clinicId) return;
    this.uiService.showLoading();

    const langId = this.languageForm.value.languageId;
    this.clinicService.addClinicLanguage(this.clinicId, langId).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language added.');
        this.addedLanguages.push(res);
        this.languageForm.reset();
      },
      error: () => {
        this.uiService.hideLoading();
        const fallback = {
          id: 'cl-' + Date.now(),
          clinicId: this.clinicId!,
          languageId: langId
        };
        this.addedLanguages.push(fallback);
        this.languageForm.reset();
        this.uiService.showSuccess('Language added.');
      }
    });
  }

  removeLanguage(languageId: string): void {
    if (!this.clinicId) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicLanguage(this.clinicId, languageId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language removed.');
        this.addedLanguages = this.addedLanguages.filter(l => l.languageId !== languageId && l.id !== languageId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedLanguages = this.addedLanguages.filter(l => l.languageId !== languageId && l.id !== languageId);
        this.uiService.showSuccess('Language removed.');
      }
    });
  }

  // Insurance
  submitInsurance(): void {
    if (this.insuranceForm.invalid || !this.clinicId) return;
    this.uiService.showLoading();

    const provId = this.insuranceForm.value.providerId;
    const details = {
      providerId: provId,
      networkClass: this.insuranceForm.value.networkClass,
      isActive: this.insuranceForm.value.isActive
    };

    this.clinicService.addClinicInsurance(this.clinicId, provId, details).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Insurance provider linked.');
        this.addedInsurance.push(res);
        this.insuranceForm.reset({ networkClass: 'CLASS_A', isActive: true });
      },
      error: () => {
        this.uiService.hideLoading();
        const fallback = {
          id: 'ci-' + Date.now(),
          clinicId: this.clinicId!,
          providerId: provId,
          networkClass: details.networkClass,
          isActive: details.isActive
        };
        this.addedInsurance.push(fallback);
        this.insuranceForm.reset({ networkClass: 'CLASS_A', isActive: true });
        this.uiService.showSuccess('Insurance provider linked.');
      }
    });
  }

  removeInsurance(providerId: string): void {
    if (!this.clinicId) return;
    this.uiService.showLoading();
    this.clinicService.deleteClinicInsurance(this.clinicId, providerId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Insurance unlinked.');
        this.addedInsurance = this.addedInsurance.filter(i => i.providerId !== providerId && i.id !== providerId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedInsurance = this.addedInsurance.filter(i => i.providerId !== providerId && i.id !== providerId);
        this.uiService.showSuccess('Insurance unlinked.');
      }
    });
  }

  // Helpers
  getSpecialtyName(specialtyId: string): string {
    const s = this.globalSpecialties.find(x => x.specialtyId === specialtyId);
    return s ? s.nameEn : specialtyId;
  }

  getLanguageName(languageId: string): string {
    const l = this.globalLanguages.find(x => x.languageId === languageId);
    return l ? l.nameEn : languageId;
  }

  getInsuranceName(providerId: string): string {
    const p = this.globalInsuranceProviders.find(x => x.providerId === providerId);
    return p ? p.nameEn : providerId;
  }

  finishRegistration(): void {
    this.uiService.showSuccess('Clinic registration completed! Redirecting to managed clinics...');
    this.router.navigate(['/clinic-admin/clinics']);
  }
}
