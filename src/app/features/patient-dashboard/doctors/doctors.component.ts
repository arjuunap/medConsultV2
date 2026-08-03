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
import { TranslatePipe, TranslateObjPipe } from '../../../shared/pipes/translate.pipe';
import { SpecialtyResponseDto, LanguageResponseDto, CityResponseDto } from '../../../core/models/reference.model';
import { DoctorResponseDto, DoctorDetailResponse } from '../../../core/models/doctor.model';
import { ClinicResponseDto } from '../../../core/models/clinic.model';

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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslatePipe, TranslateObjPipe],
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
  public selectedSpecialtyId: string = '';
  public selectedCityId: string = '';
  public selectedRating: number = 0;
  public selectedLanguageId: string = '';
  public minExperience: number = 0;
  public maxFee: number = 500;

  // Selected doctor details state
  public selectedDoctorDetail: DoctorDetailResponse | null = null;
  public showDetailModal: boolean = false;
  public detailSpecialties: SpecialtyResponseDto[] = [];
  public detailLanguages: LanguageResponseDto[] = [];

  ngOnInit(): void {
    this.loadAllData();
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

    // 2. Specialty Filter
    if (this.selectedSpecialtyId) {
      list = list.filter(d => d.specialtyIds.includes(this.selectedSpecialtyId));
    }

    // 3. City/Area Filter (Resolved from doctor's clinic branches)
    if (this.selectedCityId) {
      list = list.filter(d => d.cityIds.includes(this.selectedCityId));
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
    this.selectedSpecialtyId = '';
    this.selectedCityId = '';
    this.selectedRating = 0;
    this.selectedLanguageId = '';
    this.minExperience = 0;
    this.maxFee = 500;
    this.applyFilters();
  }

  viewDoctorDetails(doctorId: string): void {
    this.uiService.showLoading();
    forkJoin({
      profile: this.doctorService.getDoctorProfile(doctorId),
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.selectedDoctorDetail = res.profile;
        this.detailSpecialties = res.specialties;
        this.detailLanguages = res.languages;

        // Enrich clinics assigned
        if (this.selectedDoctorDetail && this.selectedDoctorDetail.clinics && this.selectedDoctorDetail.clinics.length > 0) {
          const clinicCalls = this.selectedDoctorDetail.clinics.map(c => 
            forkJoin({
              clinic: this.clinicService.getClinicById(c.clinicId).pipe(catchError(() => of(null))),
              branches: this.clinicService.getClinicBranches(c.clinicId).pipe(catchError(() => of([])))
            }).pipe(catchError(() => of(null)))
          );

          forkJoin(clinicCalls).subscribe({
            next: (clinicsRes) => {
              if (this.selectedDoctorDetail && this.selectedDoctorDetail.clinics) {
                this.selectedDoctorDetail.clinics.forEach((c, idx) => {
                  const r = clinicsRes[idx];
                  if (r && r.clinic) {
                    (c as any).clinicNameEn = r.clinic.nameEn;
                    (c as any).clinicNameAr = r.clinic.nameAr;
                    if (r.branches) {
                      const br = r.branches.find((b: any) => b.branchId === c.branchId);
                      if (br) {
                        (c as any).branchNameEn = br.branchNameEn;
                        (c as any).branchNameAr = br.branchNameAr;
                      }
                    }
                  }
                });
              }
              this.uiService.hideLoading();
              this.showDetailModal = true;
            },
            error: () => {
              this.uiService.hideLoading();
              this.showDetailModal = true;
            }
          });
        } else {
          this.uiService.hideLoading();
          this.showDetailModal = true;
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load profile details.');
      }
    });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedDoctorDetail = null;
  }

  bookAppointment(doctorId: string): void {
    this.router.navigate(['/patient/book-appointment'], { queryParams: { doctorId } });
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
}
