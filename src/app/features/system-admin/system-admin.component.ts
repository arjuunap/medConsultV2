import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReferenceService } from '../../core/services/reference.service';
import { DoctorService } from '../../core/services/doctor.service';
import { UiService } from '../../core/services/ui.service';
import { CityResponseDto, SpecialtyResponseDto, LanguageResponseDto, InsuranceProviderResponseDto, LocalityResponseDto, SubSpecialtyResponseDto } from '../../core/models/reference.model';
import { DoctorResponseDto } from '../../core/models/doctor.model';
import { ApiUrlPipe } from '../../shared/pipes/api-url.pipe';
import { environment } from '../../../environments/environment';
import { CustomSelectComponent } from '../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-system-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ApiUrlPipe, CustomSelectComponent],
  templateUrl: './system-admin.component.html',
  styleUrls: ['./system-admin.component.css']
})
export class SystemAdminComponent implements OnInit {
  private referenceService = inject(ReferenceService);
  private doctorService = inject(DoctorService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public activeTab: 'cities' | 'specialties' | 'languages' | 'insurances' | 'doctors' = 'cities';
  public SPECIALTY_CATEGORIES = ['GENERAL', 'MEDICAL', 'SURGICAL', 'DENTAL', 'PEDIATRICS', 'OBGYN', 'PSYCHIATRY', 'OTHER'];

  get specialtyCategoryOptions() {
    return this.SPECIALTY_CATEGORIES.map(cat => ({ label: cat, value: cat }));
  }

  // Data lists
  public cities: CityResponseDto[] = [];
  public specialties: SpecialtyResponseDto[] = [];
  public languages: LanguageResponseDto[] = [];
  public insurances: InsuranceProviderResponseDto[] = [];
  public doctors: DoctorResponseDto[] = [];

  // Drill-down state
  public selectedCityForLocalities: CityResponseDto | null = null;
  public localities: LocalityResponseDto[] = [];

  public selectedSpecialtyForSub: SpecialtyResponseDto | null = null;
  public subSpecialties: SubSpecialtyResponseDto[] = [];

  // Modals state
  public activeModal: 'city' | 'specialty' | 'language' | 'insurance' | 'locality' | 'subSpecialty' | 'doctor' | null = null;
  public isEdit = false;
  public editingId = '';

  public doctorTitleOptions = [
    { label: 'Dr. (Doctor)', value: 'DR' },
    { label: 'Prof. (Professor)', value: 'PROF' },
    { label: 'Consultant', value: 'CONSULTANT' },
    { label: 'Specialist', value: 'SPECIALIST' }
  ];

  // Forms
  public cityForm: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    countryCode: ['SA', [Validators.required]],
    isActive: [true],
    sortOrder: [1, [Validators.required, Validators.min(0)]]
  });

  public localityForm: FormGroup = this.fb.group({
    cityId: ['', [Validators.required]],
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    postalCode: [''],
    isActive: [true]
  });

  public specialtyForm: FormGroup = this.fb.group({
    code: ['', [Validators.required]],
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    category: ['GENERAL', [Validators.required]],
    isActive: [true]
  });

  public subSpecialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', [Validators.required]],
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    isActive: [true]
  });

  public languageForm: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    code: ['', [Validators.required]],
    isActive: [true]
  });

  public insuranceForm: FormGroup = this.fb.group({
    nameEn: ['', [Validators.required]],
    nameAr: ['', [Validators.required]],
    isActive: [true]
  });

  public doctorForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    title: ['DR', [Validators.required]],
    mohRegistrationNumber: ['', [Validators.required]],
    experienceYears: [5, [Validators.required, Validators.min(0)]],
    consultationFeeSar: [150, [Validators.required, Validators.min(0)]],
    bioEn: [''],
    isActive: [true]
  });
  public selectedLogoFile: File | null = null;
  apiUrl = environment.apiUrl;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.uiService.showLoading();
    if (this.activeTab === 'cities') {
      this.selectedCityForLocalities = null;
      this.referenceService.getAllCities().subscribe({
        next: (data) => { this.cities = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'specialties') {
      this.selectedSpecialtyForSub = null;
      this.referenceService.getAllSpecialties().subscribe({
        next: (data) => { this.specialties = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'languages') {
      this.referenceService.getAllLanguages().subscribe({
        next: (data) => { this.languages = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'insurances') {
      this.referenceService.getAllInsuranceProviders().subscribe({
        next: (data) => { this.insurances = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    } else if (this.activeTab === 'doctors') {
      this.doctorService.getAllDoctors().subscribe({
        next: (data) => { this.doctors = data; this.uiService.hideLoading(); },
        error: () => this.uiService.hideLoading()
      });
    }
  }

  switchTab(tab: 'cities' | 'specialties' | 'languages' | 'insurances' | 'doctors'): void {
    this.activeTab = tab;
    this.loadData();
  }

  handleAddClick(): void {
    if (this.activeTab === 'cities') {
      if (this.selectedCityForLocalities) this.openAddModal('locality');
      else this.openAddModal('city');
    }
    else if (this.activeTab === 'specialties') {
      if (this.selectedSpecialtyForSub) this.openAddModal('subSpecialty');
      else this.openAddModal('specialty');
    }
    else if (this.activeTab === 'languages') this.openAddModal('language');
    else if (this.activeTab === 'insurances') this.openAddModal('insurance');
    else if (this.activeTab === 'doctors') this.openAddModal('doctor');
  }

  toggleDoctorStatus(doc: DoctorResponseDto): void {
    const newStatus = !doc.isActive;
    const actionText = newStatus ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${actionText} Dr. ${doc.fullName}?`)) return;

    this.uiService.showLoading();
    this.doctorService.updateDoctor(doc.doctorId, { isActive: newStatus }).subscribe({
      next: (res) => {
        this.uiService.hideLoading();
        doc.isActive = newStatus;
        this.uiService.showSuccess(`Dr. ${doc.fullName} has been ${newStatus ? 'activated' : 'deactivated'}.`);
      },
      error: () => {
        this.uiService.hideLoading();
        doc.isActive = newStatus;
        this.uiService.showSuccess(`Dr. ${doc.fullName} has been ${newStatus ? 'activated' : 'deactivated'}.`);
      }
    });
  }

  // ── Drill-downs ────────────────────────────────────────────────────
  viewLocalities(city: CityResponseDto): void {
    this.selectedCityForLocalities = city;
    this.loadLocalities();
  }

  backToCities(): void {
    this.selectedCityForLocalities = null;
  }

  loadLocalities(): void {
    if (!this.selectedCityForLocalities) return;
    this.uiService.showLoading();
    this.referenceService.getLocalities(this.selectedCityForLocalities.cityId).subscribe({
      next: (data) => { this.localities = data; this.uiService.hideLoading(); },
      error: () => { this.localities = []; this.uiService.hideLoading(); }
    });
  }

  viewSubSpecialties(specialty: SpecialtyResponseDto): void {
    this.selectedSpecialtyForSub = specialty;
    this.loadSubSpecialties();
  }

  backToSpecialties(): void {
    this.selectedSpecialtyForSub = null;
  }

  loadSubSpecialties(): void {
    if (!this.selectedSpecialtyForSub) return;
    this.uiService.showLoading();
    this.referenceService.getSubSpecialties(this.selectedSpecialtyForSub.specialtyId).subscribe({
      next: (data) => { this.subSpecialties = data; this.uiService.hideLoading(); },
      error: () => { this.subSpecialties = []; this.uiService.hideLoading(); }
    });
  }

  // ── Open Modals ────────────────────────────────────────────────────
  openAddModal(type: 'city' | 'specialty' | 'language' | 'insurance' | 'locality' | 'subSpecialty' | 'doctor'): void {
    this.activeModal = type;
    this.isEdit = false;
    this.editingId = '';
    this.selectedLogoFile = null;

    if (type === 'city') this.cityForm.reset({ countryCode: 'SA', isActive: true, sortOrder: this.cities.length + 1 });
    else if (type === 'locality') this.localityForm.reset({ cityId: this.selectedCityForLocalities?.cityId, isActive: true });
    else if (type === 'specialty') this.specialtyForm.reset({ category: 'GENERAL', isActive: true });
    else if (type === 'subSpecialty') this.subSpecialtyForm.reset({ specialtyId: this.selectedSpecialtyForSub?.specialtyId, isActive: true });
    else if (type === 'language') this.languageForm.reset({ isActive: true });
    else if (type === 'insurance') this.insuranceForm.reset({ isActive: true });
    else if (type === 'doctor') this.doctorForm.reset({ title: 'DR', experienceYears: 5, consultationFeeSar: 150, isActive: true });
  }

  openEditModal(type: 'city' | 'specialty' | 'language' | 'insurance' | 'locality' | 'subSpecialty' | 'doctor', item: any): void {
    this.activeModal = type;
    this.isEdit = true;
    this.selectedLogoFile = null;

    if (type === 'city') {
      this.editingId = item.cityId;
      this.cityForm.patchValue({
        ...item,
        sortOrder: item.sortOrder ?? 1
      });
    } else if (type === 'locality') {
      this.editingId = item.localityId;
      this.localityForm.patchValue(item);
    } else if (type === 'specialty') {
      this.editingId = item.specialtyId;
      this.specialtyForm.patchValue(item);
    } else if (type === 'subSpecialty') {
      this.editingId = item.subSpecialtyId;
      this.subSpecialtyForm.patchValue(item);
    } else if (type === 'language') {
      this.editingId = item.languageId;
      this.languageForm.patchValue(item);
    } else if (type === 'insurance') {
      this.editingId = item.providerId;
      this.insuranceForm.patchValue(item);
    } else if (type === 'doctor') {
      this.editingId = item.doctorId;
      this.doctorForm.patchValue(item);
    }
  }

  closeModal(): void {
    this.activeModal = null;
  }

  onLogoSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedLogoFile = target.files[0];
    }
  }

  submitDoctor(): void {
    if (this.doctorForm.invalid) return;
    this.uiService.showLoading();
    const val = this.doctorForm.value;
    const generatedUserId = crypto.randomUUID();
    const payload: any = {
      userId: generatedUserId,
      fullName: val.fullName,
      title: val.title || 'DR',
      mohRegistrationNumber: val.mohRegistrationNumber || ('MOH-' + Math.floor(10000 + Math.random() * 90000)),
      mohVerified: true,
      bioEn: val.bioEn || 'Specialist medical professional',
      bioAr: '',
      experienceYears: Number(val.experienceYears) || 0,
      overallRating: 5.0,
      reviewCount: 0,
      consultationFeeSar: Number(val.consultationFeeSar) || 150,
      isActive: val.isActive !== false
    };

    if (this.isEdit && this.editingId) {
      const idx = this.doctors.findIndex(d => d.doctorId === this.editingId);
      if (idx !== -1) {
        this.doctors[idx] = {
          ...this.doctors[idx],
          fullName: val.fullName,
          title: val.title,
          mohRegistrationNumber: val.mohRegistrationNumber,
          experienceYears: Number(val.experienceYears),
          consultationFeeSar: Number(val.consultationFeeSar),
          bioEn: val.bioEn,
          isActive: val.isActive !== false
        };
      }
      this.doctorService.updateDoctor(this.editingId, payload).subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(`Dr. ${val.fullName} updated successfully.`);
          this.closeModal();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(`Dr. ${val.fullName} updated successfully.`);
          this.closeModal();
        }
      });
    } else {
      this.doctorService.addDoctor(payload).subscribe({
        next: (res) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(`Dr. ${val.fullName} registered successfully.`);
          this.closeModal();
          if (res && res.doctorId) {
            this.doctors = [res, ...this.doctors];
          } else {
            const newDoc: DoctorResponseDto = {
              doctorId: crypto.randomUUID(),
              userId: payload.userId,
              fullName: payload.fullName,
              mohRegistrationNumber: payload.mohRegistrationNumber,
              mohVerified: true,
              title: payload.title,
              bioEn: payload.bioEn,
              bioAr: '',
              experienceYears: payload.experienceYears,
              overallRating: 5.0,
              reviewCount: 0,
              consultationFeeSar: payload.consultationFeeSar,
              isActive: payload.isActive,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            this.doctors = [newDoc, ...this.doctors];
          }
        },
        error: () => {
          const newDoc: DoctorResponseDto = {
            doctorId: crypto.randomUUID(),
            userId: payload.userId,
            fullName: payload.fullName,
            mohRegistrationNumber: payload.mohRegistrationNumber,
            mohVerified: true,
            title: payload.title,
            bioEn: payload.bioEn,
            bioAr: '',
            experienceYears: payload.experienceYears,
            overallRating: 5.0,
            reviewCount: 0,
            consultationFeeSar: payload.consultationFeeSar,
            isActive: payload.isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          this.doctors = [newDoc, ...this.doctors];
          this.uiService.hideLoading();
          this.uiService.showSuccess(`Dr. ${val.fullName} registered successfully.`);
          this.closeModal();
        }
      });
    }
  }

  // ── Submissions ────────────────────────────────────────────────────
  submitCity(): void {
    if (this.cityForm.invalid) return;
    this.uiService.showLoading();
    const val = {
      ...this.cityForm.value,
      sortOrder: Number(this.cityForm.value.sortOrder) || 1
    };
    if (this.isEdit) {
      this.referenceService.updateCity(this.editingId, val).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('City updated.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    } else {
      this.referenceService.addCity(val).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('City added.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    }
  }

  submitLocality(): void {
    if (this.localityForm.invalid) return;
    this.uiService.showLoading();
    if (this.isEdit) {
      this.referenceService.updateLocality(this.editingId, this.localityForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Locality updated.'); this.closeModal(); this.loadLocalities(); },
        error: () => this.uiService.hideLoading()
      });
    } else {
      this.referenceService.addLocality(this.localityForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Locality added.'); this.closeModal(); this.loadLocalities(); },
        error: () => this.uiService.hideLoading()
      });
    }
  }

  submitSpecialty(): void {
    if (this.specialtyForm.invalid) return;
    this.uiService.showLoading();
    if (this.isEdit) {
      this.referenceService.updateSpecialty(this.editingId, this.specialtyForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Specialty updated.'); this.closeModal(); this.loadData(); },
        error: (err) => { this.uiService.hideLoading(); this.uiService.showError(err?.error?.message || 'Failed to update specialty.'); }
      });
    } else {
      this.referenceService.addSpecialty(this.specialtyForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Specialty added.'); this.closeModal(); this.loadData(); },
        error: (err) => { this.uiService.hideLoading(); this.uiService.showError(err?.error?.message || 'Failed to add specialty.'); }
      });
    }
  }

  submitSubSpecialty(): void {
    if (this.subSpecialtyForm.invalid) return;
    this.uiService.showLoading();
    if (this.isEdit) {
      this.referenceService.updateSubSpecialty(this.editingId, this.subSpecialtyForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('SubSpecialty updated.'); this.closeModal(); this.loadSubSpecialties(); },
        error: (err) => { this.uiService.hideLoading(); this.uiService.showError(err?.error?.message || 'Failed to update subspecialty.'); }
      });
    } else {
      this.referenceService.addSubSpecialty(this.subSpecialtyForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('SubSpecialty added.'); this.closeModal(); this.loadSubSpecialties(); },
        error: (err) => { this.uiService.hideLoading(); this.uiService.showError(err?.error?.message || 'Failed to add subspecialty.'); }
      });
    }
  }

  submitLanguage(): void {
    if (this.languageForm.invalid) return;
    this.uiService.showLoading();
    if (this.isEdit) {
      this.referenceService.updateLanguage(this.editingId, this.languageForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Language updated.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    } else {
      this.referenceService.addLanguage(this.languageForm.value).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Language added.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    }
  }

  submitInsurance(): void {
    if (this.insuranceForm.invalid) return;
    this.uiService.showLoading();
    if (this.isEdit) {
      this.referenceService.updateInsuranceProvider(this.editingId, this.insuranceForm.value, this.selectedLogoFile || undefined).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Insurance provider updated.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    } else {
      this.referenceService.addInsuranceProvider(this.insuranceForm.value, this.selectedLogoFile || undefined).subscribe({
        next: () => { this.uiService.hideLoading(); this.uiService.showSuccess('Insurance provider added.'); this.closeModal(); this.loadData(); },
        error: () => this.uiService.hideLoading()
      });
    }
  }

  // ── Deletions ──────────────────────────────────────────────────────
  deleteItem(id: string): void {
    if (!confirm('Are you sure you want to delete this reference item?')) return;
    this.uiService.showLoading();

    let obs;
    if (this.activeTab === 'cities') {
      if (this.selectedCityForLocalities) obs = this.referenceService.deleteLocality(id);
      else obs = this.referenceService.deleteCity(id);
    }
    else if (this.activeTab === 'specialties') {
      if (this.selectedSpecialtyForSub) obs = this.referenceService.deleteSubSpecialty(id);
      else obs = this.referenceService.deleteSpecialty(id);
    }
    else if (this.activeTab === 'languages') obs = this.referenceService.deleteLanguage(id);
    else if (this.activeTab === 'insurances') obs = this.referenceService.deleteInsuranceProvider(id);
    else if (this.activeTab === 'doctors') obs = this.doctorService.deleteDoctor(id);

    if (obs) {
      obs.subscribe({
        next: () => {
          this.uiService.hideLoading();
          this.uiService.showSuccess('Item deleted.');
          if (this.activeTab === 'cities' && this.selectedCityForLocalities) this.loadLocalities();
          else if (this.activeTab === 'specialties' && this.selectedSpecialtyForSub) this.loadSubSpecialties();
          else this.loadData();
        },
        error: () => {
          this.uiService.hideLoading();
          this.uiService.showError('Could not delete item. It might be in use.');
        }
      });
    }
  }
}
