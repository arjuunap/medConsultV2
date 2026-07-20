import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { UiService } from '../../../core/services/ui.service';
import { DoctorResponseDto, DoctorClinicResponseDto } from '../../../core/models/doctor.model';
import { ClinicResponseDto, ClinicBranchResponseDto } from '../../../core/models/clinic.model';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './doctors.component.html',
  styleUrls: []
})
export class DoctorsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private clinicService = inject(ClinicService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public clinics: ClinicResponseDto[] = [];
  public branches: ClinicBranchResponseDto[] = [];
  public doctors: DoctorResponseDto[] = [];

  // Mappings list
  public doctorClinics: DoctorClinicResponseDto[] = [];

  public linkForm: FormGroup = this.fb.group({
    clinicId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    doctorId: ['', [Validators.required]],
    isActive: [true]
  });

  public isAddModalOpen = false;

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.uiService.showLoading();
    this.clinicService.getAllClinics().subscribe({
      next: (clinicsData) => {
        this.clinics = clinicsData;
        if (clinicsData.length > 0) {
          this.linkForm.patchValue({ clinicId: clinicsData[0].clinicId });
          this.onClinicChange();
        }
      }
    });

    this.doctorService.getAllDoctors().subscribe({
      next: (docsData) => {
        this.doctors = docsData;
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  onClinicChange(): void {
    const clinicId = this.linkForm.value.clinicId;
    this.branches = [];
    this.linkForm.patchValue({ branchId: '' });
    if (!clinicId) return;

    this.clinicService.getClinicBranches(clinicId).subscribe({
      next: (data) => {
        this.branches = data;
        if (data.length > 0) {
          this.linkForm.patchValue({ branchId: data[0].branchId });
          this.loadMappings();
        }
      }
    });
  }

  loadMappings(): void {
    const clinicId = this.linkForm.value.clinicId;
    if (!clinicId) return;

    this.uiService.showLoading();
    // Fetch mappings for each doctor to find which ones work at this clinic
    this.doctorClinics = [];
    let count = this.doctors.length;
    if (count === 0) {
      this.uiService.hideLoading();
      return;
    }

    let loaded = 0;
    const tempMappings: DoctorClinicResponseDto[] = [];

    for (const doc of this.doctors) {
      this.doctorService.getDoctorClinics(doc.doctorId).subscribe({
        next: (mappings) => {
          const match = mappings.filter((m: any) => m.clinicId === clinicId);
          tempMappings.push(...match);
          loaded++;
          if (loaded === count) {
            this.doctorClinics = tempMappings;
            this.uiService.hideLoading();
          }
        },
        error: () => {
          loaded++;
          if (loaded === count) {
            this.doctorClinics = tempMappings;
            this.uiService.hideLoading();
          }
        }
      });
    }
  }

  getDoctorName(doctorId: string): string {
    const doc = this.doctors.find(d => d.doctorId === doctorId);
    return doc ? `${doc.title}. ${doc.fullName}` : doctorId;
  }

  openAddModal(): void {
    this.linkForm.patchValue({
      doctorId: '',
      isActive: true
    });
    this.isAddModalOpen = true;
  }

  closeAddModal(): void {
    this.isAddModalOpen = false;
  }

  submitLink(): void {
    if (this.linkForm.invalid) {
      this.linkForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.doctorService.addDoctorClinic(this.linkForm.value).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Doctor assigned to branch successfully.');
        this.closeAddModal();
        this.loadMappings();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to assign doctor.');
      }
    });
  }

  unlinkDoctor(dcId: string): void {
    if (!confirm('Are you sure you want to remove this doctor from this branch?')) return;

    this.uiService.showLoading();
    this.doctorService.removeDoctorClinic(dcId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Doctor unassigned successfully.');
        this.loadMappings();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove assignment.');
      }
    });
  }
}
