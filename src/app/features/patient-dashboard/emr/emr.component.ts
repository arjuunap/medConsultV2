import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClinicalRecordService } from '../../../core/services/clinical-record.service';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import {
  PrescriptionResponseDto, PrescriptionItemResponseDto,
  VitalResponseDto, LabResultResponseDto, VitalSource
} from '../../../core/models/clinical-record.model';

import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { DoctorService } from '../../../core/services/doctor.service';
import { LanguageService } from '../../../core/services/language.service';
import { DoctorResponseDto } from '../../../core/models/doctor.model';

@Component({
  selector: 'app-emr',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './emr.component.html',
  styleUrls: ['./emr.component.css']
})
export class EmrComponent implements OnInit {
  private clinicalRecordService = inject(ClinicalRecordService);
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  private doctorService = inject(DoctorService);
  public languageService = inject(LanguageService);

  public patientId = '';
  public needProfileInit = false;
  
  // Tab State
  public activeTab: 'prescriptions' | 'vitals' | 'labs' = 'prescriptions';

  // Prescriptions State
  public prescriptions: PrescriptionResponseDto[] = [];
  public selectedRxItems: { [rxId: string]: PrescriptionItemResponseDto[] } = {};
  public adherenceLogs: { [rxItemId: string]: any[] } = {};
  public doctorsMap: { [id: string]: DoctorResponseDto } = {};

  // Vitals State
  public vitals: VitalResponseDto[] = [];
  public isVitalModalOpen = false;
  public vitalForm: FormGroup = this.fb.group({
    bloodPressureSystolic: [120, [Validators.min(60), Validators.max(220)]],
    bloodPressureDiastolic: [80, [Validators.min(40), Validators.max(130)]],
    heartRateBpm: [72, [Validators.min(30), Validators.max(200)]],
    bloodGlucoseMmol: [5.5, [Validators.min(1)]],
    hba1cPercent: [5.7],
    weightKg: [70],
    temperatureC: [36.6],
    oxygenSaturation: [98],
    notes: ['']
  });

  // Lab Results State
  public labResults: LabResultResponseDto[] = [];

  ngOnInit(): void {
    this.loadDoctors();
    this.checkProfileAndLoad();
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        this.doctorsMap = {};
        docs.forEach(doc => {
          this.doctorsMap[doc.doctorId] = doc;
        });
      }
    });
  }

  getDoctorDisplayName(d: DoctorResponseDto | null | undefined): string {
    if (!d) return '';
    const name = (d.fullName || '').trim();
    const nameLower = name.toLowerCase();
    if (nameLower.startsWith('dr') || nameLower.startsWith('doctor') || nameLower.startsWith('prof') || nameLower.startsWith('consultant') || nameLower.startsWith('specialist') || nameLower.startsWith('د.')) {
      return name;
    }
    const isAr = this.languageService.isArabic;
    const prefix = isAr ? 'د.' : 'Dr.';
    return `${prefix} ${name}`;
  }

  getLast7DaysLogs(itemId: string): { date: Date; status: 'taken' | 'skipped' | 'none'; label: string; isToday: boolean }[] {
    const list = [];
    const logs = this.adherenceLogs[itemId] || [];
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.logDate === dateStr);
      let status: 'taken' | 'skipped' | 'none' = 'none';
      if (log) {
        status = log.taken ? 'taken' : 'skipped';
      }
      const isToday = dateStr === todayStr;
      const label = d.toLocaleDateString(this.languageService.isArabic ? 'ar-SA' : 'en-US', { weekday: 'narrow' });
      list.push({
        date: d,
        status,
        label,
        isToday
      });
    }
    return list;
  }

  checkProfileAndLoad(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (patient) => {
        this.patientId = patient.patientId;
        this.needProfileInit = false;
        this.loadEMRData();
      },
      error: (err) => {
        this.uiService.hideLoading();
        if (err.status === 404) {
          this.needProfileInit = true;
        }
      }
    });
  }

  loadEMRData(): void {
    if (this.activeTab === 'prescriptions') {
      this.loadPrescriptions();
    } else if (this.activeTab === 'vitals') {
      this.loadVitals();
    } else if (this.activeTab === 'labs') {
      this.loadLabs();
    }
  }

  switchTab(tab: 'prescriptions' | 'vitals' | 'labs'): void {
    this.activeTab = tab;
    this.loadEMRData();
  }

  // ── Prescriptions & Adherence ──────────────────────────────────────
  loadPrescriptions(): void {
    this.uiService.showLoading();
    this.clinicalRecordService.searchPrescriptions({ patientId: this.patientId, page: 0, size: 20 }).subscribe({
      next: (page) => {
        this.prescriptions = page.content;
        this.uiService.hideLoading();
        // Load items for each prescription
        for (const rx of this.prescriptions) {
          this.loadPrescriptionItems(rx.prescriptionId);
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  loadPrescriptionItems(rxId: string): void {
    this.clinicalRecordService.getPrescriptionItems(rxId).subscribe({
      next: (items) => {
        this.selectedRxItems[rxId] = items;
        for (const item of items) {
          this.loadAdherenceLogs(item.itemId);
        }
      }
    });
  }

  loadAdherenceLogs(itemId: string): void {
    this.clinicalRecordService.searchAdherence({ patientId: this.patientId, rxItemId: itemId, page: 0, size: 10 }).subscribe({
      next: (page) => {
        this.adherenceLogs[itemId] = page.content;
      }
    });
  }

  getAdherenceLogForToday(itemId: string): any {
    const logs = this.adherenceLogs[itemId];
    if (!logs || logs.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    return logs.find(log => log.logDate === todayStr);
  }

  logAdherence(itemId: string, taken: boolean, skippedReason?: string): void {
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const payload = {
      rxItemId: itemId,
      patientId: this.patientId,
      logDate: todayStr,
      taken,
      takenAt: taken ? new Date().toISOString() : undefined,
      skippedReason: !taken ? skippedReason || 'No Reason' : undefined
    };

    this.uiService.showLoading();
    this.clinicalRecordService.createAdherence(payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Daily adherence logged!');
        this.loadAdherenceLogs(itemId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Adherence record already exists or failed to save.');
      }
    });
  }

  // ── Vitals Log ─────────────────────────────────────────────────────
  loadVitals(): void {
    this.uiService.showLoading();
    this.clinicalRecordService.searchVitals({ patientId: this.patientId, page: 0, size: 30, sortBy: 'recordedAt', sortDir: 'desc' }).subscribe({
      next: (page) => {
        this.vitals = page.content;
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  openVitalModal(): void {
    this.vitalForm.reset({
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRateBpm: 72,
      bloodGlucoseMmol: 5.5,
      hba1cPercent: 5.7,
      weightKg: 70,
      temperatureC: 36.6,
      oxygenSaturation: 98,
      notes: ''
    });
    this.isVitalModalOpen = true;
  }

  closeVitalModal(): void {
    this.isVitalModalOpen = false;
  }

  submitVital(): void {
    if (this.vitalForm.invalid) {
      this.vitalForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const payload = {
      ...this.vitalForm.value,
      patientId: this.patientId,
      recordedAt: new Date().toISOString(),
      source: VitalSource.PATIENT_APP
    };

    this.clinicalRecordService.createVital(payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Vitals logged successfully.');
        this.closeVitalModal();
        this.loadVitals();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to record vital metrics.');
      }
    });
  }

  // ── Lab Results ────────────────────────────────────────────────────
  loadLabs(): void {
    this.uiService.showLoading();
    this.clinicalRecordService.searchLabResults({ patientId: this.patientId, page: 0, size: 20 }).subscribe({
      next: (page) => {
        this.labResults = page.content;
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  downloadLabFile(fileId: string): void {
    if (!fileId) return;
    this.uiService.showLoading();
    this.clinicalRecordService.downloadFile(fileId).subscribe({
      next: (blob: Blob) => {
        this.uiService.hideLoading();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Lab_Report_${fileId.substring(0, 8)}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.uiService.hideLoading();
        console.error('Failed to download lab report attachment:', err);
        this.uiService.showError('Could not download lab attachment.');
      }
    });
  }
}
