import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClinicService } from '../../core/services/clinic.service';
import { ReferenceService } from '../../core/services/reference.service';
import { AuthService } from '../../core/services/auth.service';
import { ClinicResponseDto, ClinicDetailResponse } from '../../core/models/clinic.model';
import { SpecialtyResponseDto } from '../../core/models/reference.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: []
})
export class LandingComponent implements OnInit {
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public specialties: SpecialtyResponseDto[] = [];
  public clinics: ClinicResponseDto[] = [];
  public selectedClinicDetail: ClinicDetailResponse | null = null;
  public searchForm: FormGroup = this.fb.group({
    name: [''],
    specialtyId: ['']
  });

  ngOnInit(): void {
    this.loadSpecialties();
    this.executeSearch();
  }

  loadSpecialties(): void {
    this.referenceService.getAllSpecialties().subscribe({
      next: (data) => this.specialties = data,
      error: () => {}
    });
  }

  executeSearch(): void {
    const filters = this.searchForm.value;
    this.clinicService.searchClinics({
      name: filters.name || undefined,
      specialtyId: filters.specialtyId || undefined,
      page: 0,
      size: 20
    }).subscribe({
      next: (page) => this.clinics = page.content,
      error: () => {}
    });
  }

  selectClinic(clinicId: string): void {
    this.clinicService.getClinicDetail(clinicId).subscribe({
      next: (detail) => this.selectedClinicDetail = detail,
      error: () => {}
    });
  }

  closeDetail(): void {
    this.selectedClinicDetail = null;
  }
}
