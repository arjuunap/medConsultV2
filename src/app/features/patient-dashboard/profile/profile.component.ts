import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import { BloodType, MaritalStatus } from '../../../core/models/patient.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, CustomSelectComponent, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  public languageService = inject(LanguageService);

  public isEditMode = false;
  public profileExists = false;

  public bloodTypes = Object.values(BloodType);
  public maritalStatuses = Object.values(MaritalStatus);

  get bloodTypeOptions() {
    return this.bloodTypes.map(bt => ({
      label: bt.replace('_POS', '+').replace('_NEG', '-').replace('_', ' '),
      value: bt
    }));
  }

  get nationalityOptions() {
    return this.nationalities.map(nat => ({
      label: `${nat.flag} ${this.languageService.isArabic ? nat.nameAr : nat.nameEn}`,
      value: nat.code
    }));
  }

  get maritalStatusOptions() {
    return this.maritalStatuses.map(ms => ({
      label: this.languageService.translate(ms, this.getMaritalStatusAr(ms)),
      value: ms
    }));
  }

  private getMaritalStatusAr(ms: string): string {
    switch (ms) {
      case MaritalStatus.SINGLE: return 'أعزب';
      case MaritalStatus.MARRIED: return 'متزوج';
      case MaritalStatus.DIVORCED: return 'مطلق';
      case MaritalStatus.WIDOWED: return 'أرمل';
      default: return ms;
    }
  }

  public nationalities: { code: string; flag: string; nameEn: string; nameAr: string }[] = [
    { code: 'SA', flag: '🇸🇦', nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية' },
    { code: 'AE', flag: '🇦🇪', nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة' },
    { code: 'KW', flag: '🇰🇼', nameEn: 'Kuwait', nameAr: 'الكويت' },
    { code: 'QA', flag: '🇶🇦', nameEn: 'Qatar', nameAr: 'قطر' },
    { code: 'BH', flag: '🇧🇭', nameEn: 'Bahrain', nameAr: 'البحرين' },
    { code: 'OM', flag: '🇴🇲', nameEn: 'Oman', nameAr: 'عُمان' },
    { code: 'EG', flag: '🇪🇬', nameEn: 'Egypt', nameAr: 'مصر' },
    { code: 'JO', flag: '🇯🇴', nameEn: 'Jordan', nameAr: 'الأردن' },
    { code: 'LB', flag: '🇱🇧', nameEn: 'Lebanon', nameAr: 'لبنان' },
    { code: 'SY', flag: '🇸🇾', nameEn: 'Syria', nameAr: 'سوريا' },
    { code: 'YE', flag: '🇾🇪', nameEn: 'Yemen', nameAr: 'اليمن' },
    { code: 'IQ', flag: '🇮🇶', nameEn: 'Iraq', nameAr: 'العراق' },
    { code: 'SD', flag: '🇸🇩', nameEn: 'Sudan', nameAr: 'السودان' },
    { code: 'PS', flag: '🇵🇸', nameEn: 'Palestine', nameAr: 'فلسطين' },
    { code: 'TN', flag: '🇹🇳', nameEn: 'Tunisia', nameAr: 'تونس' },
    { code: 'MA', flag: '🇲🇦', nameEn: 'Morocco', nameAr: 'المغرب' },
    { code: 'DZ', flag: '🇩🇿', nameEn: 'Algeria', nameAr: 'الجزائر' },
    { code: 'IN', flag: '🇮🇳', nameEn: 'India', nameAr: 'الهند' },
    { code: 'PK', flag: '🇵🇰', nameEn: 'Pakistan', nameAr: 'باكستان' },
    { code: 'BD', flag: '🇧🇩', nameEn: 'Bangladesh', nameAr: 'بنجلاديش' },
    { code: 'PH', flag: '🇵🇭', nameEn: 'Philippines', nameAr: 'الفلبين' },
    { code: 'ID', flag: '🇮🇩', nameEn: 'Indonesia', nameAr: 'إندونيسيا' },
    { code: 'US', flag: '🇺🇸', nameEn: 'United States', nameAr: 'الولايات المتحدة' },
    { code: 'GB', flag: '🇬🇧', nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة' },
    { code: 'CA', flag: '🇨🇦', nameEn: 'Canada', nameAr: 'كندا' },
    { code: 'AU', flag: '🇦🇺', nameEn: 'Australia', nameAr: 'أستراليا' },
    { code: 'DE', flag: '🇩🇪', nameEn: 'Germany', nameAr: 'ألمانيا' },
    { code: 'FR', flag: '🇫🇷', nameEn: 'France', nameAr: 'فرنسا' },
    { code: 'IT', flag: '🇮🇹', nameEn: 'Italy', nameAr: 'إيطاليا' },
    { code: 'ES', flag: '🇪🇸', nameEn: 'Spain', nameAr: 'إسبانيا' },
    { code: 'TR', flag: '🇹🇷', nameEn: 'Turkey', nameAr: 'تركيا' },
    { code: 'OT', flag: '🌐', nameEn: 'Other', nameAr: 'جنسية أخرى' }
  ];

  public profileForm: FormGroup = this.fb.group({
    dateOfBirth: ['', [Validators.required]],
    bloodType: [BloodType.Unknown, [Validators.required]],
    nationalId: ['', [Validators.required, Validators.pattern(/^[0-9a-zA-Z]{5,20}$/)]],
    nationality: ['', [Validators.required, Validators.minLength(2)]],
    maritalStatus: [MaritalStatus.SINGLE, [Validators.required]],
    emergencyContactName: ['', [Validators.required]],
    emergencyContactPhone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 \-]{7,20}$/)]],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.uiService.hideLoading();
        this.profileExists = true;
        this.profileForm.patchValue(profile);
        this.profileForm.disable(); // Read-only by default
      },
      error: (err) => {
        this.uiService.hideLoading();
        const errorMessage = err.error?.message || '';
        if (err.status === 404 || errorMessage.includes('not found')) {
          this.profileExists = false;
          this.isEditMode = true; // Automatically edit for creation
          this.profileForm.enable();
        } else {
          this.uiService.showError(this.languageService.translate('Could not load patient profile.', 'تعذر تحميل ملف المريض.'));
        }
      }
    });
  }

  enableEdit(): void {
    this.isEditMode = true;
    this.profileForm.enable();
  }

  cancelEdit(): void {
    if (this.profileExists) {
      this.isEditMode = false;
      this.profileForm.disable();
      this.loadProfile(); // reload original values
    }
  }

  onSubmit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = this.profileForm.value;

    if (this.profileExists) {
      this.patientService.updateProfile(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Profile updated successfully.', 'تم تحديث الملف الشخصي بنجاح.'));
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || this.languageService.translate('Failed to update profile.', 'فشل في تحديث الملف الشخصي.'));
        }
      });
    } else {
      this.patientService.createProfile(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(this.languageService.translate('Profile initialized successfully.', 'تم إنشاء الملف الشخصي بنجاح.'));
          this.profileExists = true;
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || this.languageService.translate('Failed to initialize profile.', 'فشل في إنشاء الملف الشخصي.'));
        }
      });
    }
  }
}
