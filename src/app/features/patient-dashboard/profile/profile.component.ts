import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import { BloodType, MaritalStatus } from '../../../core/models/patient.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public isEditMode = false;
  public profileExists = false;

  public bloodTypes = Object.values(BloodType);
  public maritalStatuses = Object.values(MaritalStatus);
  public nationalities: { code: string; flag: string }[] = [
    { code: 'SA', flag: '🇸🇦' },
    { code: 'AE', flag: '🇦🇪' },
    { code: 'KW', flag: '🇰🇼' },
    { code: 'QA', flag: '🇶🇦' },
    { code: 'BH', flag: '🇧🇭' },
    { code: 'OM', flag: '🇴🇲' },
    { code: 'EG', flag: '🇪🇬' },
    { code: 'JO', flag: '🇯🇴' },
    { code: 'LB', flag: '🇱🇧' },
    { code: 'SY', flag: '🇸🇾' },
    { code: 'YE', flag: '🇾🇪' },
    { code: 'IQ', flag: '🇮🇶' },
    { code: 'SD', flag: '🇸🇩' },
    { code: 'PS', flag: '🇵🇸' },
    { code: 'TN', flag: '🇹🇳' },
    { code: 'MA', flag: '🇲🇦' },
    { code: 'DZ', flag: '🇩🇿' },
    { code: 'IN', flag: '🇮🇳' },
    { code: 'PK', flag: '🇵🇰' },
    { code: 'BD', flag: '🇧🇩' },
    { code: 'PH', flag: '🇵🇭' },
    { code: 'ID', flag: '🇮🇩' },
    { code: 'US', flag: '🇺🇸' },
    { code: 'GB', flag: '🇬🇧' },
    { code: 'CA', flag: '🇨🇦' },
    { code: 'AU', flag: '🇦🇺' },
    { code: 'DE', flag: '🇩🇪' },
    { code: 'FR', flag: '🇫🇷' },
    { code: 'IT', flag: '🇮🇹' },
    { code: 'ES', flag: '🇪🇸' },
    { code: 'TR', flag: '🇹🇷' },
    { code: 'OT', flag: '🌐' }
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
          this.uiService.showError('Could not load patient profile.');
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
          this.uiService.showSuccess('Profile updated successfully.');
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || 'Failed to update profile.');
        }
      });
    } else {
      this.patientService.createProfile(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Profile initialized successfully.');
          this.profileExists = true;
          this.isEditMode = false;
          this.profileForm.disable();
          this.profileForm.patchValue(res);
        },
        error: (err) => {
          this.uiService.hideLoading();
          this.uiService.showError(err.error?.message || 'Failed to create profile.');
        }
      });
    }
  }
}
