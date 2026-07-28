import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DoctorService } from '../../core/services/doctor.service';
import { ReferenceService } from '../../core/services/reference.service';
import { UiService } from '../../core/services/ui.service';
import { DoctorDetailResponse } from '../../core/models/doctor.model';
import { SpecialtyResponseDto, LanguageResponseDto } from '../../core/models/reference.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor-detail.component.html',
  styleUrls: ['./doctor-detail.component.css']
})
export class DoctorDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private doctorService = inject(DoctorService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);

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
        this.uiService.hideLoading();
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
    return specialty ? specialty.nameEn : 'Specialist';
  }

  getLanguageName(languageId: string): string {
    const lang = this.globalLanguages.find(l => l.languageId === languageId);
    return lang ? lang.nameEn : 'Unknown Language';
  }
}
