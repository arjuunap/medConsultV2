import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DoctorService } from '../../../core/services/doctor.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { UiService } from '../../../core/services/ui.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService } from '../../../core/services/patient.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';
import { SpecialtyResponseDto, LanguageResponseDto, CityResponseDto } from '../../../core/models/reference.model';
import { DoctorResponseDto } from '../../../core/models/doctor.model';
import { ClinicResponseDto } from '../../../core/models/clinic.model';

import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

export interface EnrichedDoctor extends DoctorResponseDto {
  specialtyIds: string[];
  languageIds: string[];
  clinicIds: string[];
  cityIds: string[];
  initials: string;
  avatarBg: string;
  avatarColor: string;
}

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, ApiUrlPipe, CustomSelectComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private referenceService = inject(ReferenceService);
  private clinicService = inject(ClinicService);
  private uiService = inject(UiService);
  public languageService = inject(LanguageService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private patientService = inject(PatientService);

  // References lists
  public specialties: SpecialtyResponseDto[] = [];
  public languages: LanguageResponseDto[] = [];
  public cities: CityResponseDto[] = [];
  public clinics: ClinicResponseDto[] = [];

  // Branch city mapping helper
  public branchToCityIdMap: { [branchId: string]: string } = {};

  // Doctors list data
  public rawDoctors: DoctorResponseDto[] = [];
  public enrichedDoctors: EnrichedDoctor[] = [];
  public filteredDoctors: EnrichedDoctor[] = [];

  // Active filters state
  public searchQuery: string = '';
  public selectedSpecialtyIds: string[] = [];
  public selectedCityIds: string[] = [];
  public selectedRating: number = 0;
  public selectedLanguageId: string = '';
  public minExperience: number = 0;
  public maxFee: number = 500;
  public showAdvancedFilters: boolean = false;
  public mobileFilterDrawerOpen: boolean = false;

  get activeFilterCount(): number {
    let count = 0;
    if (this.selectedSpecialtyIds && this.selectedSpecialtyIds.length > 0) count += this.selectedSpecialtyIds.length;
    if (this.selectedCityIds && this.selectedCityIds.length > 0) count += this.selectedCityIds.length;
    if (this.selectedRating > 0) count++;
    if (this.selectedLanguageId) count++;
    if (this.minExperience > 0) count++;
    if (this.maxFee < 500) count++;
    return count;
  }

  toggleMobileFilterDrawer(): void {
    this.mobileFilterDrawerOpen = !this.mobileFilterDrawerOpen;
  }

  closeMobileFilterDrawer(): void {
    this.mobileFilterDrawerOpen = false;
  }

  removeSpecialtyFilter(id: string): void {
    this.selectedSpecialtyIds = this.selectedSpecialtyIds.filter(s => s !== id);
    this.applyFilters();
  }

  removeCityFilter(id: string): void {
    this.selectedCityIds = this.selectedCityIds.filter(c => c !== id);
    this.applyFilters();
  }

  get specialtyOptions() {
    return this.specialties.map(s => ({
      label: this.languageService.isArabic && s.nameAr ? s.nameAr : s.nameEn || '',
      value: s.specialtyId
    }));
  }

  get cityOptions() {
    return this.cities.map(c => ({
      label: this.languageService.isArabic && c.nameAr ? c.nameAr : c.nameEn || '',
      value: c.cityId
    }));
  }

  get ratingSelectOptions() {
    const isAr = this.languageService.isArabic;
    return [
      { label: isAr ? 'جميع التقييمات' : 'All Ratings', value: 0 },
      { label: '★ ★ ★ ★ ★ (5.0)', value: 5, ratingStars: [1, 1, 1, 1, 1], subText: '(5.0)' },
      { label: '★ ★ ★ ★ ½ (4.5+)', value: 4.5, ratingStars: [1, 1, 1, 1, 0.5], subText: '(4.5+)' },
      { label: '★ ★ ★ ★ ☆ (4.0+)', value: 4, ratingStars: [1, 1, 1, 1, 0], subText: '(4.0+)' },
      { label: '★ ★ ★ ☆ ☆ (3.0+)', value: 3, ratingStars: [1, 1, 1, 0, 0], subText: '(3.0+)' }
    ];
  }

  get languageSelectOptions() {
    return [
      { label: this.languageService.isArabic ? 'جميع اللغات' : 'All Languages', value: '' },
      ...this.languages.map(l => ({
        label: this.languageService.isArabic && l.nameAr ? l.nameAr : l.nameEn || '',
        value: l.languageId
      }))
    ];
  }

  public patientId: string = '';

  ngOnInit(): void {
    this.loadAllData();
    this.loadPatientProfile();
  }

  loadPatientProfile(): void {
    if (this.authService.isLoggedIn() && this.authService.currentUser()?.role === 'PATIENT') {
      this.patientService.getMyProfile().subscribe({
        next: (p) => this.patientId = p.patientId,
        error: () => { }
      });
    }
  }

  loadAllData(): void {
    this.uiService.showLoading();

    forkJoin({
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([]))),
      cities: this.referenceService.getAllCities().pipe(catchError(() => of([]))),
      clinics: this.clinicService.getAllClinics().pipe(catchError(() => of([]))),
      doctors: this.doctorService.getAllDoctors().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.specialties = res.specialties;
        this.languages = res.languages;
        this.cities = res.cities;
        this.clinics = res.clinics;
        this.rawDoctors = res.doctors;

        // Fetch branches for all clinics in parallel
        if (res.clinics && res.clinics.length > 0) {
          const branchCalls = res.clinics.map(c => 
            this.clinicService.getClinicBranches(c.clinicId).pipe(
              catchError(() => of([])),
              map(branches => ({ clinicId: c.clinicId, branches }))
            )
          );

          forkJoin(branchCalls).subscribe({
            next: (branchesResults) => {
              this.branchToCityIdMap = {};
              branchesResults.forEach(item => {
                if (item && item.branches) {
                  item.branches.forEach((b: any) => {
                    this.branchToCityIdMap[b.branchId] = b.cityId;
                  });
                }
              });

              this.enrichDoctorsList();
            },
            error: () => {
              this.enrichDoctorsList();
            }
          });
        } else {
          this.enrichDoctorsList();
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctors list.');
      }
    });
  }

  enrichDoctorsList(): void {
    if (this.rawDoctors && this.rawDoctors.length > 0) {
      const enrichmentCalls = this.rawDoctors.map((doc, idx) => {
        return forkJoin({
          specialties: this.doctorService.getDoctorSpecialties(doc.doctorId).pipe(catchError(() => of([]))),
          languages: this.doctorService.getDoctorLanguages(doc.doctorId).pipe(catchError(() => of([]))),
          clinics: this.doctorService.getDoctorClinics(doc.doctorId).pipe(catchError(() => of([])))
        }).pipe(
          map(enrich => {
            const initials = doc.fullName ? doc.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'DR';
            const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
            const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];
            
            // Map clinic branchIds to cityIds
            const cityIds = enrich.clinics
              .map(c => this.branchToCityIdMap[c.branchId])
              .filter(Boolean);

            return {
              ...doc,
              specialtyIds: enrich.specialties.map(s => s.specialtyId),
              languageIds: enrich.languages.map(l => l.languageId),
              clinicIds: enrich.clinics.map(c => c.clinicId),
              cityIds,
              initials,
              avatarBg: bgColors[idx % bgColors.length],
              avatarColor: textColors[idx % textColors.length]
            } as EnrichedDoctor;
          })
        );
      });

      forkJoin(enrichmentCalls).subscribe({
        next: (enriched) => {
          this.enrichedDoctors = enriched;
          this.applyFilters();
          this.uiService.hideLoading();
        },
        error: () => {
          this.uiService.hideLoading();
        }
      });
    } else {
      this.enrichedDoctors = [];
      this.applyFilters();
      this.uiService.hideLoading();
    }
  }

  applyFilters(): void {
    let list = [...this.enrichedDoctors];

    // 1. Text Search Filter
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(d => 
        d.fullName.toLowerCase().includes(q) || 
        (d.bioEn && d.bioEn.toLowerCase().includes(q)) ||
        (d.bioAr && d.bioAr.toLowerCase().includes(q))
      );
    }

    // 2. Specialty Filter (Multi-select)
    if (this.selectedSpecialtyIds && this.selectedSpecialtyIds.length > 0) {
      list = list.filter(d => 
        d.specialtyIds && d.specialtyIds.some(id => this.selectedSpecialtyIds.includes(id))
      );
    }

    // 3. City/Area Filter (Multi-select)
    if (this.selectedCityIds && this.selectedCityIds.length > 0) {
      list = list.filter(d => 
        d.cityIds && d.cityIds.some(id => this.selectedCityIds.includes(id))
      );
    }

    // 4. Rating Filter
    if (this.selectedRating > 0) {
      list = list.filter(d => (d.overallRating || 0) >= this.selectedRating);
    }

    // 5. Language Filter
    if (this.selectedLanguageId) {
      list = list.filter(d => d.languageIds.includes(this.selectedLanguageId));
    }

    // 6. Experience Filter
    if (this.minExperience > 0) {
      list = list.filter(d => d.experienceYears >= this.minExperience);
    }

    // 7. Consultation Fee Filter
    if (this.maxFee < 500) {
      list = list.filter(d => (d.consultationFeeSar || 150) <= this.maxFee);
    }

    this.filteredDoctors = list;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedSpecialtyIds = [];
    this.selectedCityIds = [];
    this.selectedRating = 0;
    this.selectedLanguageId = '';
    this.minExperience = 0;
    this.maxFee = 500;
    this.applyFilters();
  }

  viewDoctorDetails(doctorId: string): void {
    if (this.router.url.startsWith('/patient')) {
      this.router.navigate(['/patient/doctors', doctorId]);
    } else {
      this.router.navigate(['/doctors', doctorId]);
    }
  }

  bookAppointment(doctorId: string): void {
    this.router.navigate(['/patient/book-appointment'], { queryParams: { doctorId } });
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  // Helpers
  getDoctorDisplayName(d: any): string {
    if (!d) return '';
    const name = d.fullName || '';
    const nameTrimmed = name.trim();
    const nameLower = nameTrimmed.toLowerCase();
    if (nameLower.startsWith('dr') || nameLower.startsWith('doctor') || nameLower.startsWith('prof') || nameLower.startsWith('consultant') || nameLower.startsWith('specialist') || nameLower.startsWith('د.')) {
      return nameTrimmed;
    }
    const isAr = this.languageService.isArabic;
    const prefix = isAr ? 'د.' : 'Dr.';
    return `${prefix} ${nameTrimmed}`;
  }

  getSpecialtyName(specialtyId: string): string {
    const s = this.specialties.find(x => x.specialtyId === specialtyId);
    return s ? this.languageService.translate(s.nameEn, s.nameAr) : 'Specialist';
  }

  getLanguageName(languageId: string): string {
    const l = this.languages.find(x => x.languageId === languageId);
    return l ? this.languageService.translate(l.nameEn, l.nameAr) : '';
  }

  getCityName(cityId: string): string {
    const c = this.cities.find(x => x.cityId === cityId);
    return c ? this.languageService.translate(c.nameEn, c.nameAr) : '';
  }

  getInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
