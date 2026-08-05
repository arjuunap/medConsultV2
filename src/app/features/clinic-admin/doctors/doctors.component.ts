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
  DoctorScheduleRequestDto, DoctorScheduleResponseDto, SessionType,
  DoctorLeaveResponseDto
} from '../../../core/models/doctor.model';
import { ClinicResponseDto, ClinicBranchResponseDto } from '../../../core/models/clinic.model';
import { SpecialtyResponseDto, LanguageResponseDto, SubSpecialtyResponseDto } from '../../../core/models/reference.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, RouterLink, TranslatePipe, ApiUrlPipe],
  templateUrl: './doctors.component.html',
  styleUrls: ['./doctors.component.css']
})
export class DoctorsComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private clinicService = inject(ClinicService);
  private referenceService = inject(ReferenceService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  public languageService = inject(LanguageService);

  public activeMainTab: 'placements' | 'profiles' = 'placements';
  
  // Placements state
  public clinics: ClinicResponseDto[] = [];
  public branches: ClinicBranchResponseDto[] = [];
  public doctorClinics: DoctorClinicResponseDto[] = [];
  public searchTerm: string = '';

  get clinicSelectOptions() {
    return this.clinics.map(c => ({
      label: this.languageService.isArabic ? (c.nameAr || c.nameEn) : c.nameEn,
      value: c.clinicId
    }));
  }

  get branchSelectOptions() {
    return this.branches.map(b => ({
      label: this.languageService.isArabic ? (b.branchNameAr || b.branchNameEn) : b.branchNameEn,
      value: b.branchId
    }));
  }

  get doctorSelectOptions() {
    return this.doctors.map(d => ({
      label: `${d.title || 'Dr'}. ${d.fullName}`,
      value: d.doctorId
    }));
  }

  get scheduleDayOptions() {
    return [
      { label: this.languageService.translate('Monday', 'الإثنين'), value: 1 },
      { label: this.languageService.translate('Tuesday', 'الثلاثاء'), value: 2 },
      { label: this.languageService.translate('Wednesday', 'الأربعاء'), value: 3 },
      { label: this.languageService.translate('Thursday', 'الخميس'), value: 4 },
      { label: this.languageService.translate('Friday', 'الجمعة'), value: 5 },
      { label: this.languageService.translate('Saturday', 'السبت'), value: 6 },
      { label: this.languageService.translate('Sunday', 'الأحد'), value: 7 }
    ];
  }

  get scheduleSessionTypeOptions() {
    return [
      { label: this.languageService.translate('In-Clinic', 'في العيادة'), value: 'IN_CLINIC' },
      { label: this.languageService.translate('Virtual / Online', 'افتراضي / عبر الإنترنت'), value: 'VIRTUAL' },
      { label: this.languageService.translate('Both (Hybrid)', 'كلاهما (مختلط)'), value: 'BOTH' }
    ];
  }

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

  // Doctor Leave state
  public selectedDcForLeave: DoctorClinicResponseDto | null = null;
  public doctorLeaves: DoctorLeaveResponseDto[] = [];
  public isLeaveModalOpen = false;

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
    const daysEn = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const daysAr = ['', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
    if (this.languageService.isArabic) {
      return daysAr[dayOfWeek] || `يوم ${dayOfWeek}`;
    }
    return daysEn[dayOfWeek] || `Day ${dayOfWeek}`;
  }

  // ── DOCTOR LEAVE MANAGEMENT (Clinic Side) ──────────────────────────────
  openLeaveModal(dc: DoctorClinicResponseDto): void {
    this.selectedDcForLeave = dc;
    this.isLeaveModalOpen = true;
    this.loadDcLeaves(dc.dcId);
  }

  closeLeaveModal(): void {
    this.isLeaveModalOpen = false;
    this.selectedDcForLeave = null;
    this.doctorLeaves = [];
  }

  loadDcLeaves(dcId: string): void {
    this.uiService.showLoading();
    this.doctorService.getDcLeave(dcId).subscribe({
      next: (data) => {
        this.doctorLeaves = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.doctorLeaves = [];
        this.uiService.hideLoading();
      }
    });
  }

  approveLeave(leave: DoctorLeaveResponseDto): void {
    if (!confirm(`Approve leave for ${this.getDoctorName(this.selectedDcForLeave?.doctorId || '')} from ${leave.startDate} to ${leave.endDate}?`)) return;
    this.uiService.showLoading();
    const payload = {
      dcId: leave.dcId,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      isApproved: true,
      notes: leave.notes
    };
    this.doctorService.updateLeave(leave.leaveId, payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Leave request approved.');
        this.loadDcLeaves(this.selectedDcForLeave!.dcId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to approve leave.');
      }
    });
  }

  rejectLeave(leave: DoctorLeaveResponseDto): void {
    if (!confirm(`Reject this leave request from ${leave.startDate} to ${leave.endDate}?`)) return;
    this.uiService.showLoading();
    const payload = {
      dcId: leave.dcId,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      isApproved: false,
      notes: leave.notes
    };
    this.doctorService.updateLeave(leave.leaveId, payload).subscribe({
      next: () => {
        this.uiService.showSuccess('Leave request rejected.');
        this.loadDcLeaves(this.selectedDcForLeave!.dcId);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to reject leave.');
      }
    });
  }

  get pendingLeavesCount(): number {
    return this.doctorLeaves.filter(l => !l.isApproved).length;
  }

  get approvedLeavesCount(): number {
    return this.doctorLeaves.filter(l => l.isApproved === true).length;
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
    if (!doc) return doctorId;
    const title = doc.title || '';
    const name = doc.fullName || '';
    const nameLower = name.toLowerCase().trim();
    if (nameLower.startsWith('dr') || nameLower.startsWith('prof') || nameLower.startsWith('consultant')) {
      return name;
    }
    return `${title ? title + '. ' : ''}${name}`;
  }

  getDoctorAvatarUrl(doctorId: string): string {
    const doc = this.doctors.find(d => d.doctorId === doctorId);
    return doc?.avatarUrl || '';
  }

  getBranchName(branchId: string): string {
    const branch = this.branches.find(b => b.branchId === branchId);
    if (!branch) return branchId;
    return this.languageService.isArabic ? (branch.branchNameAr || branch.branchNameEn) : branch.branchNameEn;
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
    if (!s) return specialtyId;
    return this.languageService.isArabic ? s.nameAr : s.nameEn;
  }
  
  getLanguageName(languageId: string): string {
    const l = this.globalLanguages.find(x => x.languageId === languageId);
    if (!l) return languageId;
    return this.languageService.isArabic ? l.nameAr : l.nameEn;
  }
}
