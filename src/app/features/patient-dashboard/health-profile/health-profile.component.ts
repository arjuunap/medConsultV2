import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import {
  SmokingStatus, AlcoholStatus, AllergyType, Severity, ConditionStatus,
  PatientHealthProfileResponseDto, PatientAllergyResponseDto, PatientChronicConditionResponseDto
} from '../../../core/models/patient.model';

@Component({
  selector: 'app-health-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './health-profile.component.html',
  styleUrls: []
})
export class HealthProfileComponent implements OnInit {
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public patientId = '';
  public needProfileInit = false;
  
  // Health Profile State
  public healthProfile: PatientHealthProfileResponseDto | null = null;
  public profileExists = false;
  public isProfileEdit = false;
  public smokingStatuses = Object.values(SmokingStatus);
  public alcoholStatuses = Object.values(AlcoholStatus);

  public healthForm: FormGroup = this.fb.group({
    weightKg: [0, [Validators.required, Validators.min(1)]],
    heightCm: [0, [Validators.required, Validators.min(1)]],
    smokingStatus: [SmokingStatus.NEVER, [Validators.required]],
    alcoholStatus: [AlcoholStatus.NONE, [Validators.required]],
    surgicalHistory: [''],
    familyHistory: [''],
    additionalNotes: ['']
  });

  // Allergies State
  public allergies: PatientAllergyResponseDto[] = [];
  public isAllergyModalOpen = false;
  public allergyTypes = Object.values(AllergyType);
  public severities = Object.values(Severity);
  public allergyForm: FormGroup = this.fb.group({
    allergen: ['', [Validators.required, Validators.maxLength(100)]],
    allergyType: [AllergyType.DRUG, [Validators.required]],
    reaction: ['', [Validators.required, Validators.maxLength(255)]],
    severity: [Severity.MILD, [Validators.required]],
    confirmed: [true]
  });

  // Chronic Conditions State
  public chronicConditions: PatientChronicConditionResponseDto[] = [];
  public isConditionModalOpen = false;
  public conditionStatuses = Object.values(ConditionStatus);
  public conditionForm: FormGroup = this.fb.group({
    icd10Code: ['', [Validators.required, Validators.pattern(/^[A-Z][0-9][0-9AB](?:\.[0-9A-Z]{1,4})?$/i)]],
    conditionName: ['', [Validators.required, Validators.maxLength(150)]],
    diagnosisDate: ['', [Validators.required]],
    status: [ConditionStatus.ACTIVE, [Validators.required]],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadAllHealthData();
  }

  loadAllHealthData(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (patient) => {
        this.patientId = patient.patientId;
        this.needProfileInit = false;
        this.loadHealthProfile();
        this.loadAllergies();
        this.loadChronicConditions();
      },
      error: (err) => {
        this.uiService.hideLoading();
        if (err.status === 404) {
          this.needProfileInit = true;
        }
      }
    });
  }

  // ── Health Profile ─────────────────────────────────────────────────
  loadHealthProfile(): void {
    this.patientService.getMyHealthProfile().subscribe({
      next: (profile) => {
        this.healthProfile = profile;
        this.profileExists = true;
        this.healthForm.patchValue(profile);
        this.healthForm.disable();
        this.uiService.hideLoading();
      },
      error: (err) => {
        this.uiService.hideLoading();
        if (err.status === 404) {
          this.profileExists = false;
          this.isProfileEdit = true; // Automatically edit for creation
          this.healthForm.enable();
        }
      }
    });
  }

  enableProfileEdit(): void {
    this.isProfileEdit = true;
    this.healthForm.enable();
  }

  cancelProfileEdit(): void {
    if (this.profileExists) {
      this.isProfileEdit = false;
      this.healthForm.disable();
      this.loadHealthProfile();
    }
  }

  submitHealthProfile(): void {
    if (this.healthForm.invalid) {
      this.healthForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = this.healthForm.value;

    if (this.profileExists) {
      this.patientService.updateHealthProfile(payload).subscribe({
        next: (profile) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Health profile updated successfully.');
          this.healthProfile = profile;
          this.isProfileEdit = false;
          this.healthForm.disable();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Failed to update health profile.');
        }
      });
    } else {
      this.patientService.addHealthProfile(payload).subscribe({
        next: (profile) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Health profile created successfully.');
          this.healthProfile = profile;
          this.profileExists = true;
          this.isProfileEdit = false;
          this.healthForm.disable();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Failed to save health profile.');
        }
      });
    }
  }

  // ── Allergies ──────────────────────────────────────────────────────
  loadAllergies(): void {
    this.patientService.getMyAllergies().subscribe({
      next: (data) => this.allergies = data,
      error: () => {}
    });
  }

  openAllergyModal(): void {
    this.allergyForm.reset({
      allergyType: AllergyType.DRUG,
      severity: Severity.MILD,
      confirmed: true
    });
    this.isAllergyModalOpen = true;
  }

  closeAllergyModal(): void {
    this.isAllergyModalOpen = false;
  }

  submitAllergy(): void {
    if (this.allergyForm.invalid) {
      this.allergyForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.patientService.addAllergy(this.allergyForm.value).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Allergy added successfully.');
        this.closeAllergyModal();
        this.loadAllergies();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to add allergy.');
      }
    });
  }

  deleteAllergy(allergyId: string): void {
    if (!confirm('Are you sure you want to remove this allergy?')) return;

    this.uiService.showLoading();
    this.patientService.deleteAllergy(allergyId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Allergy removed successfully.');
        this.loadAllergies();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to delete allergy.');
      }
    });
  }

  // ── Chronic Conditions ─────────────────────────────────────────────
  loadChronicConditions(): void {
    this.patientService.getMyChronicConditions().subscribe({
      next: (data) => this.chronicConditions = data,
      error: () => {}
    });
  }

  openConditionModal(): void {
    this.conditionForm.reset({
      status: ConditionStatus.ACTIVE
    });
    this.isConditionModalOpen = true;
  }

  closeConditionModal(): void {
    this.isConditionModalOpen = false;
  }

  submitCondition(): void {
    if (this.conditionForm.invalid) {
      this.conditionForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.patientService.addChronicCondition(this.conditionForm.value).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Chronic condition registered.');
        this.closeConditionModal();
        this.loadChronicConditions();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to register condition.');
      }
    });
  }

  deleteCondition(id: string): void {
    if (!confirm('Are you sure you want to remove this condition?')) return;

    this.uiService.showLoading();
    this.patientService.deleteChronicCondition(id).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Condition removed.');
        this.loadChronicConditions();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove condition.');
      }
    });
  }
}
