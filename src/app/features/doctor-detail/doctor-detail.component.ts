import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DoctorService } from '../../core/services/doctor.service';
import { ReferenceService } from '../../core/services/reference.service';
import { UiService } from '../../core/services/ui.service';
import { LanguageService } from '../../core/services/language.service';
import { ClinicService } from '../../core/services/clinic.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../shared/pipes/api-url.pipe';
import { DoctorDetailResponse } from '../../core/models/doctor.model';
import { SpecialtyResponseDto, LanguageResponseDto } from '../../core/models/reference.model';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule, TranslatePipe, RouterLink, ApiUrlPipe],
  templateUrl: './doctor-detail.component.html',
  styleUrls: ['./doctor-detail.component.css']
})
export class DoctorDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private doctorService = inject(DoctorService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  public languageService = inject(LanguageService);
  private clinicService = inject(ClinicService);

  public doctorDetail: DoctorDetailResponse | null = null;
  public doctorId: string | null = null;

  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

  ngOnInit(): void {
    this.doctorId = this.route.snapshot.paramMap.get('id');
    if (this.doctorId) {
      this.loadReferencesAndProfile(this.doctorId);
    }
  }

  loadReferencesAndProfile(id: string): void {
    this.uiService.showLoading();
    
    forkJoin({
      profile: this.doctorService.getDoctorProfile(id),
      specialties: this.referenceService.getAllSpecialties().pipe(catchError(() => of([]))),
      languages: this.referenceService.getAllLanguages().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.doctorDetail = res.profile;
        this.globalSpecialties = res.specialties;
        this.globalLanguages = res.languages;
        
        // Enrich clinics with real names from clinicService
        if (this.doctorDetail && this.doctorDetail.clinics && this.doctorDetail.clinics.length > 0) {
          const clinicCalls = this.doctorDetail.clinics.map(c => 
            forkJoin({
              clinic: this.clinicService.getClinicById(c.clinicId).pipe(catchError(() => of(null))),
              branches: this.clinicService.getClinicBranches(c.clinicId).pipe(catchError(() => of([])))
            }).pipe(catchError(() => of(null)))
          );
          forkJoin(clinicCalls).subscribe({
            next: (clinicsRes) => {
              if (this.doctorDetail && this.doctorDetail.clinics) {
                this.doctorDetail.clinics.forEach((c, idx) => {
                  const res = clinicsRes[idx];
                  if (res && res.clinic) {
                    (c as any).clinicNameEn = res.clinic.nameEn;
                    (c as any).clinicNameAr = res.clinic.nameAr;
                    if (res.branches) {
                      const br = res.branches.find((b: any) => b.branchId === c.branchId);
                      if (br) {
                        (c as any).branchNameEn = br.branchNameEn;
                        (c as any).branchNameAr = br.branchNameAr;
                      }
                    }
                  }
                });
              }
              this.uiService.hideLoading();
            },
            error: () => {
              this.uiService.hideLoading();
            }
          });
        } else {
          this.uiService.hideLoading();
        }
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctor profile.');
        console.error(err);
      }
    });
  }

  get doctor() {
    return this.doctorDetail?.doctor || {
      title: 'DR',
      fullName: '',
      isActive: false,
      mohVerified: false,
      consultationFeeSar: 150,
      experienceYears: 0,
      mohRegistrationNumber: '',
      overallRating: 5.0,
      reviewCount: 0,
      bioEn: '',
      bioAr: '',
      doctorId: '',
      userId: '',
      mohRegistrationNumberVerified: false,
      consultationFeeSarVerified: false,
      createdAt: '',
      updatedAt: ''
    } as any;
  }

  get doctorDisplayName(): string {
    if (!this.doctorDetail?.doctor) return '';
    const title = this.doctorDetail.doctor.title || '';
    const name = this.doctorDetail.doctor.fullName || '';
    const nameLower = name.toLowerCase().trim();
    if (nameLower.startsWith('dr') || nameLower.startsWith('prof') || nameLower.startsWith('consultant')) {
      return name;
    }
    return `${title ? title + '. ' : ''}${name}`;
  }

  getSpecialtyName(specialtyId: string): string {
    const specialty = this.globalSpecialties.find(s => s.specialtyId === specialtyId);
    return specialty ? this.languageService.translate(specialty.nameEn, specialty.nameAr) : 'Specialist';
  }

  getLanguageName(languageId: string): string {
    const lang = this.globalLanguages.find(l => l.languageId === languageId);
    return lang ? this.languageService.translate(lang.nameEn, lang.nameAr) : 'Unknown Language';
  }
}
