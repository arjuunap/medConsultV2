import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { ReferenceService } from '../../../core/services/reference.service';
import { UiService } from '../../../core/services/ui.service';
import { 
  DoctorResponseDto, DoctorClinicResponseDto, DoctorDetailResponse,
  DoctorSpecialtyResponseDto, DoctorLanguageResponseDto, DoctorQualificationResponseDto,
  DoctorScheduleRequestDto, DoctorScheduleResponseDto, SessionType
} from '../../../core/models/doctor.model';
import { ClinicResponseDto, ClinicBranchResponseDto } from '../../../core/models/clinic.model';
import { SpecialtyResponseDto, LanguageResponseDto, SubSpecialtyResponseDto } from '../../../core/models/reference.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public activeMainTab: 'placements' | 'profiles' = 'placements';
  
  // Placements state
  public clinics: ClinicResponseDto[] = [];
  public branches: ClinicBranchResponseDto[] = [];
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public searchTerm: string = '';

  get clinicSelectOptions() {
    return this.clinics.map(c => ({
      label: c.nameEn,
      value: c.clinicId
    }));
  }

  get branchSelectOptions() {
    return this.branches.map(b => ({
      label: b.branchNameEn,
      value: b.branchId
    }));
  }

  get doctorSelectOptions() {
    return this.doctors.map(d => ({
      label: `${d.title || 'Dr'}. ${d.fullName}`,
      value: d.doctorId
    }));
  }

  public scheduleDayOptions = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 7 }
  ];

  public scheduleSessionTypeOptions = [
    { label: 'In-Clinic', value: 'IN_CLINIC' },
    { label: 'Virtual / Online', value: 'VIRTUAL' },
    { label: 'Both (Hybrid)', value: 'BOTH' }
  ];

  get filteredDoctorClinics(): DoctorClinicResponseDto[] {
    if (!this.searchTerm.trim()) return this.doctorClinics;
    const term = this.searchTerm.toLowerCase();
    return this.doctorClinics.filter(dc => {
      const docName = this.getDoctorName(dc.doctorId).toLowerCase();
      const branchName = this.getBranchName(dc.branchId).toLowerCase();
      const dept = (dc.department || '').toLowerCase();
      return docName.includes(term) || branchName.includes(term) || dept.includes(term);
    });
  }
  
  public linkForm: FormGroup = this.fb.group({
    clinicId: ['', [Validators.required]],
    branchId: ['', [Validators.required]],
    doctorId: ['', [Validators.required]],
    department: ['General Practice', [Validators.required]],
    consultationFeeSar: [150, [Validators.required, Validators.min(0)]],
    isPrimary: [true],
    startDate: [new Date().toISOString().split('T')[0], [Validators.required]],
    isActive: [true]
  });
  public isAddModalOpen = false;

  // Profiles state
  public doctors: DoctorResponseDto[] = [];
  public selectedDoctor: DoctorDetailResponse | null = null;
  public activeProfileTab: 'specialties' | 'languages' | 'qualifications' = 'specialties';
  
  // Reference data
  public globalSpecialties: SpecialtyResponseDto[] = [];
  public globalSubSpecialties: SubSpecialtyResponseDto[] = [];
  public globalLanguages: LanguageResponseDto[] = [];

  // Profile forms
  public specialtyForm: FormGroup = this.fb.group({
    specialtyId: ['', Validators.required],
    subSpecialtyId: [''],
    isPrimary: [false]
  });

  public languageForm: FormGroup = this.fb.group({
    languageId: ['', Validators.required],
    proficiency: ['FLUENT', Validators.required]
  });

  public qualificationForm: FormGroup = this.fb.group({
    degree: ['', Validators.required],
    institution: ['', Validators.required],
    country: ['', Validators.required],
    yearObtained: ['', [Validators.required, Validators.min(1950), Validators.max(2030)]],
    sortOrder: [1, Validators.required]
  });

  // Doctor Schedule state
  public selectedDcForSchedule: DoctorClinicResponseDto | null = null;
  public doctorSchedules: DoctorScheduleResponseDto[] = [];
  public isScheduleModalOpen = false;

  public doctorScheduleForm: FormGroup = this.fb.group({
    dayOfWeek: [1, Validators.required],
    startTime: ['09:00', Validators.required],
    endTime: ['17:00', Validators.required],
    slotDurationMin: [30, [Validators.required, Validators.min(5)]],
    maxPatients: [16, [Validators.required, Validators.min(1)]],
    sessionType: ['IN_CLINIC', Validators.required],
    isActive: [true],
    validFrom: [new Date().toISOString().split('T')[0], Validators.required]
  });

  openScheduleModal(dc: DoctorClinicResponseDto): void {
    this.selectedDcForSchedule = dc;
    this.isScheduleModalOpen = true;
    this.doctorScheduleForm.reset({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMin: 30,
      maxPatients: 16,
      sessionType: 'IN_CLINIC',
      isActive: true,
      validFrom: new Date().toISOString().split('T')[0]
    });
    this.loadDcSchedules(dc.dcId);
  }

  closeScheduleModal(): void {
    this.isScheduleModalOpen = false;
    this.selectedDcForSchedule = null;
    this.doctorSchedules = [];
  }

  loadDcSchedules(dcId: string): void {
    this.uiService.showLoading();
    this.doctorService.getDcSchedules(dcId).subscribe({
      next: (data) => {
        this.doctorSchedules = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.doctorSchedules = [];
        this.uiService.hideLoading();
      }
    });
  }

  submitDoctorSchedule(): void {
    if (this.doctorScheduleForm.invalid || !this.selectedDcForSchedule) return;
    this.uiService.showLoading();

    const val = this.doctorScheduleForm.value;
    const startTimeStr = val.startTime.length === 5 ? `${val.startTime}:00` : val.startTime;
    const endTimeStr = val.endTime.length === 5 ? `${val.endTime}:00` : val.endTime;

    const payload: DoctorScheduleRequestDto = {
      dcId: this.selectedDcForSchedule.dcId,
      dayOfWeek: Number(val.dayOfWeek),
      startTime: startTimeStr,
      endTime: endTimeStr,
      slotDurationMin: Number(val.slotDurationMin),
      maxPatients: Number(val.maxPatients),
      sessionType: val.sessionType as SessionType,
      isActive: val.isActive,
      validFrom: val.validFrom
    };

    this.doctorService.addSchedule(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Schedule rule added successfully.');
        this.loadDcSchedules(this.selectedDcForSchedule!.dcId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to add schedule rule.');
      }
    });
  }

  removeDoctorSchedule(scheduleId: string): void {
    if (!confirm('Are you sure you want to remove this schedule rule?')) return;
    this.uiService.showLoading();
    this.doctorService.removeSchedule(scheduleId).subscribe({
      next: () => {
        this.uiService.showSuccess('Schedule rule removed.');
        if (this.selectedDcForSchedule) {
          this.loadDcSchedules(this.selectedDcForSchedule.dcId);
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove schedule.');
      }
    });
  }

  getDayName(dayOfWeek: number): string {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayOfWeek] || `Day ${dayOfWeek}`;
  }

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

    this.referenceService.getAllSpecialties().subscribe(data => this.globalSpecialties = data);
    this.referenceService.getAllLanguages().subscribe(data => this.globalLanguages = data);
  }

  switchMainTab(tab: 'placements' | 'profiles'): void {
    this.activeMainTab = tab;
    this.selectedDoctor = null;
  }

  // ── PLACEMENTS LOGIC ────────────────────────────────────────────────
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

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => b.branchId === branchId);
    return branch ? branch.branchNameEn : branchId;
  }

  openAddModal(): void {
    const currentClinic = this.linkForm.value.clinicId;
    const currentBranch = this.linkForm.value.branchId;
    this.linkForm.patchValue({
      clinicId: currentClinic,
      branchId: currentBranch || (this.branches.length > 0 ? this.branches[0].branchId : ''),
      doctorId: '',
      department: 'General Practice',
      consultationFeeSar: 150,
      isPrimary: true,
      startDate: new Date().toISOString().split('T')[0],
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

  // ── PROFILES LOGIC ──────────────────────────────────────────────────
  selectDoctor(doctorId: string): void {
    this.uiService.showLoading();
    this.doctorService.getDoctorProfile(doctorId).subscribe({
      next: (profile) => {
        this.selectedDoctor = profile;
        this.activeProfileTab = 'specialties';
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Could not load doctor profile');
      }
    });
  }

  backToProfilesList(): void {
    this.selectedDoctor = null;
  }

  switchProfileTab(tab: 'specialties' | 'languages' | 'qualifications'): void {
    this.activeProfileTab = tab;
  }

  onSpecialtyChange(): void {
    const specialtyId = this.specialtyForm.value.specialtyId;
    this.globalSubSpecialties = [];
    this.specialtyForm.patchValue({ subSpecialtyId: '' });
    if (!specialtyId) return;

    this.referenceService.getSubSpecialties(specialtyId).subscribe(data => {
      this.globalSubSpecialties = data;
    });
  }

  submitSpecialty(): void {
    if (this.specialtyForm.invalid || !this.selectedDoctor) return;
    this.uiService.showLoading();
    
    const payload = {
      ...this.specialtyForm.value,
      doctorId: this.selectedDoctor.doctorId
    };
    
    // Convert empty string subSpecialtyId to undefined
    if (!payload.subSpecialtyId) delete payload.subSpecialtyId;

    this.doctorService.addSpecialty(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Specialty added');
        this.specialtyForm.reset({ isPrimary: false });
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding specialty');
      }
    });
  }

  removeSpecialty(id: string): void {
    if (!confirm('Remove this specialty?')) return;
    this.uiService.showLoading();
    this.doctorService.removeSpecialty(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Specialty removed');
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing specialty');
      }
    });
  }

  submitLanguage(): void {
    if (this.languageForm.invalid || !this.selectedDoctor) return;
    this.uiService.showLoading();
    const payload = {
      ...this.languageForm.value,
      doctorId: this.selectedDoctor.doctorId
    };

    this.doctorService.addLanguage(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Language added');
        this.languageForm.reset({ proficiency: 'FLUENT' });
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding language');
      }
    });
  }

  removeLanguage(id: string): void {
    if (!confirm('Remove this language?')) return;
    this.uiService.showLoading();
    this.doctorService.removeLanguage(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Language removed');
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing language');
      }
    });
  }

  submitQualification(): void {
    if (this.qualificationForm.invalid || !this.selectedDoctor) return;
    this.uiService.showLoading();
    const payload = {
      ...this.qualificationForm.value,
      doctorId: this.selectedDoctor.doctorId
    };

    this.doctorService.addQualification(payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Qualification added');
        this.qualificationForm.reset({ sortOrder: 1 });
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Error adding qualification');
      }
    });
  }

  removeQualification(id: string): void {
    if (!confirm('Remove this qualification?')) return;
    this.uiService.showLoading();
    this.doctorService.removeQualification(id).subscribe({
      next: () => {
        this.uiService.showSuccess('Qualification removed');
        this.selectDoctor(this.selectedDoctor!.doctorId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Error removing qualification');
      }
    });
  }

  // Helpers
  getSpecialtyName(specialtyId: string): string {
    const s = this.globalSpecialties.find(x => x.specialtyId === specialtyId);
    return s ? s.nameEn : specialtyId;
  }
  
  getLanguageName(languageId: string): string {
    const l = this.globalLanguages.find(x => x.languageId === languageId);
    return l ? l.nameEn : languageId;
  }
}
