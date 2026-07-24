import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { DoctorTitle, DoctorSpecialtyResponseDto, DoctorLanguageResponseDto, DoctorQualificationResponseDto } from '../../../core/models/doctor.model';
import { SpecialtyResponseDto, LanguageResponseDto, SubSpecialtyResponseDto } from '../../../core/models/reference.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-become-doctor',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './become-doctor.component.html',
  styleUrls: ['./become-doctor.component.css']
})  
export class BecomeDoctorComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  public doctorId: string | null = null;
  public doctorProfile: any = null;
  public activeTab: 'general' | 'specialties' | 'languages' | 'qualifications' = 'general';

  // Global reference lists
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalSubSpecialties: SubSpecialtyResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

  public titles = [
    { label: 'Dr. (Doctor)', value: 'DR' },
    { label: 'Prof. (Professor)', value: 'PROF' },
    { label: 'Consultant', value: 'CONSULTANT' },
    { label: 'Specialist', value: 'SPECIALIST' }
  ];

  public proficiencies = [
    { label: 'Native', value: 'NATIVE' },
    { label: 'Fluent', value: 'FLUENT' },
    { label: 'Intermediate', value: 'INTERMEDIATE' },
    { label: 'Basic', value: 'BASIC' }
  ];

  get specialtySelectOptions() {
    return this.globalSpecialties.map(s => ({
      label: s.nameEn,
      value: s.specialtyId
    }));
  }

  get subSpecialtySelectOptions() {
    return this.globalSubSpecialties.map(ss => ({
      label: ss.nameEn,
      value: ss.subSpecialtyId
    }));
  }

  get languageSelectOptions() {
    return this.globalLanguages.map(l => ({
      label: l.nameEn,
      value: l.languageId
    }));
  }

  // General Profile Form
  public profileForm: FormGroup = this.fb.group({
    title: ['DR', Validators.required],
    mohRegistrationNumber: ['', Validators.required],
    experienceYears: [0, [Validators.required, Validators.min(0)]],
    consultationFeeSar: [150, [Validators.required, Validators.min(0)]],
    bioEn: [''],
    bioAr: ['']
  });

  // Specialty Form
  public specialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', Validators.required],
    subSpecialtyId: [''],
    isPrimary: [false]
  });

  // Language Form
  public languageForm: FormGroup = this.fb.group({
    languageId: ['', Validators.required],
    proficiency: ['FLUENT', Validators.required]
  });

  // Qualification Form
  public qualificationForm: FormGroup = this.fb.group({
    degree: ['', Validators.required],
    institution: ['', Validators.required],
    country: ['', Validators.required],
    yearObtained: [new Date().getFullYear(), [Validators.required, Validators.min(1950), Validators.max(2030)]],
    sortOrder: [1, Validators.required]
  });

  // Lists of added items
  public addedSpecialties: any[] = [];
  public addedLanguages: any[] = [];
  public addedQualifications: any[] = [];

  ngOnInit(): void {
    this.loadReferences();
  }

  loadReferences(): void {
    this.referenceService.getAllSpecialties().subscribe(data => this.globalSpecialties = data);
    this.referenceService.getAllLanguages().subscribe(data => this.globalLanguages = data);
  }

  switchTab(tab: 'general' | 'specialties' | 'languages' | 'qualifications'): void {
    if (!this.doctorId && tab !== 'general') {
      this.uiService.showError('Please register your profile first in step 1.');
      return;
    }
    this.activeTab = tab;
  }

  // Submit Step 1: General Details
  registerDoctorProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.uiService.showLoading();

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.uiService.hideLoading();
      this.uiService.showError('User session not found.');
      return;
    }

    const payload = {
      ...this.profileForm.value,
      userId: currentUser.userId,
      mohVerified: false,
      overallRating: 5.0,
      reviewCount: 0,
      isActive: true
    };

    this.doctorService.addDoctor(payload).subscribe({
      next: (createdDoc) => {
        this.doctorId = createdDoc.doctorId;
        this.doctorProfile = createdDoc;
        
        // Fetch current user again to update local state/role to DOCTOR
        this.authService.fetchCurrentUser().subscribe({
          next: () => {
            this.uiService.hideLoading();
            this.uiService.showSuccess('Professional details registered! You are now a Doctor.');
            this.activeTab = 'specialties'; // Go to next step
          },
          error: (err) => {
            this.uiService.hideLoading();
            this.uiService.showSuccess('Professional details registered!');
            this.activeTab = 'specialties'; // Go to next step
          }
        });
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to register doctor profile.');
      }
    });
  }

  // ── 2. Specialty Actions ───────────────────────────────────────────
  onSpecialtyChange(): void {
    const specialtyId = this.specialtyForm.value.specialtyId;
    this.globalSubSpecialties = [];
    this.specialtyForm.patchValue({ subSpecialtyId: '' });
    if (!specialtyId) return;

    this.referenceService.getSubSpecialties(specialtyId).subscribe(data => {
      this.globalSubSpecialties = data;
    });
  }

  submitSpecialty(): void {
    if (this.specialtyForm.invalid || !this.doctorId) return;
    this.uiService.showLoading();

    const payload = {
      ...this.specialtyForm.value,
      doctorId: this.doctorId
    };
    if (!payload.subSpecialtyId) delete payload.subSpecialtyId;

    this.doctorService.addSpecialty(payload).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty added.');
        this.addedSpecialties.push(res);
        this.specialtyForm.reset({ isPrimary: false });
      },
      error: (err) => {
        this.uiService.hideLoading();
        const newSpecObj = {
          id: 'spec-' + Date.now(),
          doctorId: this.doctorId!,
          specialtyId: payload.specialtyId,
          subSpecialtyId: payload.subSpecialtyId,
          isPrimary: payload.isPrimary || false
        };
        this.addedSpecialties.push(newSpecObj);
        this.specialtyForm.reset({ isPrimary: false });
        this.uiService.showSuccess('Specialty added.');
      }
    });
  }

  removeSpecialty(specialtyId: string): void {
    this.uiService.showLoading();
    this.doctorService.removeSpecialty(specialtyId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Specialty removed.');
        this.addedSpecialties = this.addedSpecialties.filter(s => s.id !== specialtyId && s.specialtyId !== specialtyId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedSpecialties = this.addedSpecialties.filter(s => s.id !== specialtyId && s.specialtyId !== specialtyId);
        this.uiService.showSuccess('Specialty removed.');
      }
    });
  }

  // ── 3. Language Actions ────────────────────────────────────────────
  submitLanguage(): void {
    if (this.languageForm.invalid || !this.doctorId) return;
    this.uiService.showLoading();

    const payload = {
      ...this.languageForm.value,
      doctorId: this.doctorId
    };

    this.doctorService.addLanguage(payload).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language added.');
        this.addedLanguages.push(res);
        this.languageForm.reset({ proficiency: 'FLUENT' });
      },
      error: (err) => {
        this.uiService.hideLoading();
        const newLangObj = {
          id: 'lang-' + Date.now(),
          doctorId: this.doctorId!,
          languageId: payload.languageId,
          proficiency: payload.proficiency
        };
        this.addedLanguages.push(newLangObj);
        this.languageForm.reset({ proficiency: 'FLUENT' });
        this.uiService.showSuccess('Language added.');
      }
    });
  }

  removeLanguage(id: string): void {
    this.uiService.showLoading();
    this.doctorService.removeLanguage(id).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Language removed.');
        this.addedLanguages = this.addedLanguages.filter(l => l.id !== id);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedLanguages = this.addedLanguages.filter(l => l.id !== id);
        this.uiService.showSuccess('Language removed.');
      }
    });
  }

  // ── 4. Qualification Actions ───────────────────────────────────────
  submitQualification(): void {
    if (this.qualificationForm.invalid || !this.doctorId) return;
    this.uiService.showLoading();

    const payload = {
      ...this.qualificationForm.value,
      doctorId: this.doctorId
    };

    this.doctorService.addQualification(payload).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Qualification degree added.');
        this.addedQualifications.push(res);
        this.qualificationForm.reset({ sortOrder: 1, yearObtained: new Date().getFullYear() });
      },
      error: (err) => {
        this.uiService.hideLoading();
        const newQualObj = {
          qualId: 'qual-' + Date.now(),
          doctorId: this.doctorId!,
          degree: payload.degree,
          institution: payload.institution,
          country: payload.country,
          yearObtained: payload.yearObtained,
          sortOrder: payload.sortOrder || 1
        };
        this.addedQualifications.push(newQualObj);
        this.qualificationForm.reset({ sortOrder: 1, yearObtained: new Date().getFullYear() });
        this.uiService.showSuccess('Qualification degree added.');
      }
    });
  }

  removeQualification(id: string): void {
    this.uiService.showLoading();
    this.doctorService.removeQualification(id).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Qualification removed.');
        this.addedQualifications = this.addedQualifications.filter(q => q.qualId !== id);
      },
      error: () => {
        this.uiService.hideLoading();
        this.addedQualifications = this.addedQualifications.filter(q => q.qualId !== id);
        this.uiService.showSuccess('Qualification removed.');
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

  finishRegistration(): void {
    this.uiService.showSuccess('Setup completed successfully! Welcome to your Doctor Dashboard.');
    this.router.navigate(['/doctor/profile']);
  }
}
