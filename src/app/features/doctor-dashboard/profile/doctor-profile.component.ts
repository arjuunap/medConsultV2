import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { 
  DoctorDetailResponse, DoctorTitle,
  DoctorSpecialtyResponseDto, DoctorLanguageResponseDto, DoctorQualificationResponseDto 
} from '../../../core/models/doctor.model';
import { SpecialtyResponseDto, LanguageResponseDto, SubSpecialtyResponseDto } from '../../../core/models/reference.model';

@Component({
  selector: 'app-doctor-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './doctor-profile.component.html',
  styleUrls: []
})
export class DoctorProfileComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public apiUrl = environment.apiUrl;
  public doctorProfile: DoctorDetailResponse | null = null;
  public activeTab: 'general' | 'specialties' | 'languages' | 'qualifications' | 'clinics' = 'general';

  // Global reference lists
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalSubSpecialties: SubSpecialtyResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

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

  ngOnInit(): void {
    this.loadDoctorData();
    this.loadReferences();
  }

  loadReferences(): void {
    this.referenceService.getAllSpecialties().subscribe(data => this.globalSpecialties = data);
    this.referenceService.getAllLanguages().subscribe(data => this.globalLanguages = data);
  }

  loadDoctorData(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    this.uiService.showLoading();
    this.doctorService.getAllDoctors().subscribe({
      next: (doctors) => {
        const myDoc = doctors.find(d => d.userId === currentUser.userId);
        if (myDoc) {
          this.fetchFullProfile(myDoc.doctorId);
        } else if (doctors.length > 0) {
          // Fallback to first doctor if user mapping is direct
          this.fetchFullProfile(doctors[0].doctorId);
        } else {
          this.uiService.hideLoading();
          this.uiService.showWarning('No doctor record associated with your account.');
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctor directory.');
      }
    });
  }

  fetchFullProfile(doctorId: string): void {
    this.doctorService.getDoctorProfile(doctorId).subscribe({
      next: (profile) => {
        this.doctorProfile = profile;
        this.profileForm.patchValue({
          title: profile.title || 'DR',
          mohRegistrationNumber: profile.mohRegistrationNumber || '',
          experienceYears: profile.experienceYears || 0,
          consultationFeeSar: profile.consultationFeeSar || 150,
          bioEn: profile.bioEn || '',
          bioAr: profile.bioAr || ''
        });
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to fetch doctor profile details.');
      }
    });
  }

  switchTab(tab: 'general' | 'specialties' | 'languages' | 'qualifications' | 'clinics'): void {
    this.activeTab = tab;
  }

  // ── 1. General Profile Update ──────────────────────────────────────
  saveGeneralProfile(): void {
    if (this.profileForm.invalid || !this.doctorProfile) return;
    this.uiService.showLoading();

    const payload = {
      ...this.profileForm.value,
      userId: this.doctorProfile.userId,
      mohVerified: this.doctorProfile.mohVerified,
      overallRating: this.doctorProfile.overallRating,
      reviewCount: this.doctorProfile.reviewCount,
      isActive: this.doctorProfile.isActive
    };

    this.doctorService.updateDoctor(this.doctorProfile.doctorId, payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Professional bio & credentials updated successfully.');
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to update profile.');
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
    if (this.specialtyForm.invalid || !this.doctorProfile) return;
    this.uiService.showLoading();

    const payload = {
      ...this.specialtyForm.value,
      doctorId: this.doctorProfile.doctorId
    };
    if (!payload.subSpecialtyId) delete payload.subSpecialtyId;

    this.doctorService.addSpecialty(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Specialty added to your profile.');
        this.specialtyForm.reset({ isPrimary: false });
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding specialty.');
      }
    });
  }

  removeSpecialty(id: string): void {
    if (!confirm('Are you sure you want to remove this specialty?')) return;
    this.uiService.showLoading();

    this.doctorService.removeSpecialty(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Specialty removed.');
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing specialty.');
      }
    });
  }

  // ── 3. Language Actions ────────────────────────────────────────────
  submitLanguage(): void {
    if (this.languageForm.invalid || !this.doctorProfile) return;
    this.uiService.showLoading();

    const payload = {
      ...this.languageForm.value,
      doctorId: this.doctorProfile.doctorId
    };

    this.doctorService.addLanguage(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Language added.');
        this.languageForm.reset({ proficiency: 'FLUENT' });
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding language.');
      }
    });
  }

  removeLanguage(id: string): void {
    if (!confirm('Remove this language from your profile?')) return;
    this.uiService.showLoading();

    this.doctorService.removeLanguage(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Language removed.');
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing language.');
      }
    });
  }

  // ── 4. Qualification Actions ───────────────────────────────────────
  submitQualification(): void {
    if (this.qualificationForm.invalid || !this.doctorProfile) return;
    this.uiService.showLoading();

    const payload = {
      ...this.qualificationForm.value,
      doctorId: this.doctorProfile.doctorId
    };

    this.doctorService.addQualification(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Qualification degree added.');
        this.qualificationForm.reset({ sortOrder: 1, yearObtained: new Date().getFullYear() });
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding qualification.');
      }
    });
  }

  removeQualification(id: string): void {
    if (!confirm('Remove this qualification degree?')) return;
    this.uiService.showLoading();

    this.doctorService.removeQualification(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Qualification removed.');
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing qualification.');
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
}
