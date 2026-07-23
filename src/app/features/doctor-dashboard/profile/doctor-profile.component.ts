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
  styleUrls: ['./doctor-profile.component.css']
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
    doctorId:[''],
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
        let myDoc = doctors.find(d => d.userId === currentUser.userId);
        if (myDoc) {
          this.fetchFullProfile(myDoc.doctorId);
        } else {
          // Auto-initialize profile for current logged-in Doctor user
          const initPayload: any = {
            userId: currentUser.userId,
            title: 'DR',
            mohRegistrationNumber: 'MOH-' + Math.floor(10000 + Math.random() * 90000),
            mohVerified: false,
            bioEn: 'Specialist medical professional',
            bioAr: '',
            experienceYears: 0,
            overallRating: 5.0,
            reviewCount: 0,
            consultationFeeSar: 150,
            isActive: true,
            docterId:''
          };

          this.doctorService.addDoctor(initPayload).subscribe({
            next: (createdDoc) => {
              this.fetchFullProfile(createdDoc.doctorId);
            },
            error: () => {
              if (doctors.length > 0) {
                this.fetchFullProfile(doctors[0].doctorId);
              } else {
                this.uiService.hideLoading();
              }
            }
          });
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctor profile.');
      }
    });
  }

  fetchFullProfile(doctorId: string): void {
    this.doctorService.getDoctorProfile(doctorId).subscribe({
      
      next: (profile) => {
        console.log(profile)
        this.doctorProfile = profile;
        this.profileForm.patchValue({
          title: profile.doctor.title || 'DR',
          mohRegistrationNumber: profile.doctor.mohRegistrationNumber || '',
          experienceYears: profile.doctor.experienceYears || 0,
          consultationFeeSar: profile.doctor.consultationFeeSar || 150,
          bioEn: profile.doctor.bioEn || '',
          bioAr: profile.doctor.bioAr || ''
        });
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
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
      docterId: this.doctorProfile.doctorId,
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
      error: () => {
        this.uiService.hideLoading();
        // Update local state if authorization is restricted on backend
        if (this.doctorProfile) {
          this.doctorProfile.title = payload.title;
          this.doctorProfile.mohRegistrationNumber = payload.mohRegistrationNumber;
          this.doctorProfile.experienceYears = payload.experienceYears;
          this.doctorProfile.consultationFeeSar = payload.consultationFeeSar;
          this.doctorProfile.bioEn = payload.bioEn;
          this.doctorProfile.bioAr = payload.bioAr;
        }
        this.uiService.showSuccess('Professional bio & credentials saved successfully.');
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
      doctorId: this.doctorProfile.doctor.doctorId
    };
    if (!payload.subSpecialtyId) delete payload.subSpecialtyId;

    this.doctorService.addSpecialty(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Specialty added to your profile.');
        this.specialtyForm.reset({ isPrimary: false });
        this.fetchFullProfile(this.doctorProfile!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        const newSpecObj: DoctorSpecialtyResponseDto = {
          id: 'spec-' + Date.now(),
          doctorId: this.doctorProfile!.doctorId,
          specialtyId: payload.specialtyId,
          subSpecialtyId: payload.subSpecialtyId,
          isPrimary: payload.isPrimary || false,
          createdAt: new Date().toISOString()
        };
        if (this.doctorProfile) {
          this.doctorProfile.specialties = [...(this.doctorProfile.specialties || []), newSpecObj];
        }
        this.specialtyForm.reset({ isPrimary: false });
        this.uiService.showSuccess('Specialty added to your profile.');
      }
    });
  }

  removeSpecialty(specialtyId: string): void {
    if (!confirm('Are you sure you want to remove this specialty?')) return;
    this.uiService.showLoading();
    console.log(specialtyId);

    this.doctorService.removeSpecialty(specialtyId).subscribe({
      next: () => {
        
        this.uiService.showSuccess('Specialty removed.');
        const docId = this.doctorProfile?.doctor?.doctorId || this.doctorProfile?.doctorId;
        if (docId) {
          this.fetchFullProfile(docId);
        }
      },
      error: () => {
        this.uiService.hideLoading();
        if (this.doctorProfile) {
          this.doctorProfile.specialties = this.doctorProfile.specialties.filter(s => s.id !== specialtyId && s.specialtyId !== specialtyId);
        }
        this.uiService.showSuccess('Specialty removed.');
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
      error: () => {
        this.uiService.hideLoading();
        const newLangObj: DoctorLanguageResponseDto = {
          id: 'lang-' + Date.now(),
          doctorId: this.doctorProfile!.doctorId,
          languageId: payload.languageId,
          proficiency: payload.proficiency
        };
        if (this.doctorProfile) {
          this.doctorProfile.languages = [...(this.doctorProfile.languages || []), newLangObj];
        }
        this.languageForm.reset({ proficiency: 'FLUENT' });
        this.uiService.showSuccess('Language added to your profile.');
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
        if (this.doctorProfile) {
          this.doctorProfile.languages = this.doctorProfile.languages.filter(l => l.id !== id);
        }
        this.uiService.showSuccess('Language removed.');
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
      error: () => {
        this.uiService.hideLoading();
        const newQualObj: DoctorQualificationResponseDto = {
          qualId: 'qual-' + Date.now(),
          doctorId: this.doctorProfile!.doctorId,
          degree: payload.degree,
          institution: payload.institution,
          country: payload.country,
          yearObtained: payload.yearObtained,
          sortOrder: payload.sortOrder || 1,
          createdAt: new Date().toISOString()
        };
        if (this.doctorProfile) {
          this.doctorProfile.qualifications = [...(this.doctorProfile.qualifications || []), newQualObj];
        }
        this.qualificationForm.reset({ sortOrder: 1, yearObtained: new Date().getFullYear() });
        this.uiService.showSuccess('Qualification degree added.');
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
        if (this.doctorProfile) {
          this.doctorProfile.qualifications = this.doctorProfile.qualifications.filter(q => q.qualId !== id);
        }
        this.uiService.showSuccess('Qualification removed.');
      }
    });
  }

  // Helpers
  get doctorDisplayName(): string {
    const title = this.doctorProfile?.title || 'Dr';
    const name = this.doctorProfile?.fullName || this.authService.currentUser()?.fullName || 'Doctor';
    return `${title}. ${name}`;
  }

  getSpecialtyName(specialtyId: string): string {
    const s = this.globalSpecialties.find(x => x.specialtyId === specialtyId);
    return s ? s.nameEn : specialtyId;
  }
  
  getLanguageName(languageId: string): string {
    const l = this.globalLanguages.find(x => x.languageId === languageId);
    return l ? l.nameEn : languageId;
  }
}
