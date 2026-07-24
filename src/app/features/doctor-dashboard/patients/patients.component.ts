import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PatientService } from '../../../core/services/patient.service';
import { ClinicalRecordService } from '../../../core/services/clinical-record.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { ConsultationService } from '../../../core/services/consultation.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { PatientHealthProfileResponseDto, PatientAllergyResponseDto, PatientChronicConditionResponseDto } from '../../../core/models/patient.model';
import {
  VitalResponseDto, VitalSource,
  PrescriptionResponseDto, PrescriptionItemResponseDto, PrescriptionStatus,
  LabResultResponseDto, LabResultStatus, ResultFlag
} from '../../../core/models/clinical-record.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';

interface PatientOption {
  patientId: string;
  patientName: string;
}

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CustomSelectComponent],
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.css']
})
export class PatientsComponent implements OnInit {
  private patientService = inject(PatientService);
  private clinicalRecordService = inject(ClinicalRecordService);
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private consultationService = inject(ConsultationService);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);

  public patientList: PatientOption[] = [];
  public selectedPatientId = '';
  public selectedPatientName = '';

  get patientChartSelectOptions() {
    return this.patientList.map(p => ({
      label: p.patientName,
      value: p.patientId
    }));
  }

  public rxRouteOptions = [
    { label: 'Oral', value: 'ORAL' },
    { label: 'Intravenous', value: 'INTRAVENOUS' },
    { label: 'Topical', value: 'TOPICAL' }
  ];

  // EMR Chart details
  public healthProfile: PatientHealthProfileResponseDto | null = null;
  public allergies: PatientAllergyResponseDto[] = [];
  public chronicConditions: PatientChronicConditionResponseDto[] = [];
  public prescriptions: PrescriptionResponseDto[] = [];
  public selectedRxItems: { [rxId: string]: PrescriptionItemResponseDto[] } = {};
  public vitals: VitalResponseDto[] = [];
  public labResults: LabResultResponseDto[] = [];

  // Add EMR overlays
  public activeModal: 'vital' | 'prescription' | 'lab' | null = null;

  // Forms
  public vitalForm: FormGroup = this.fb.group({
    bloodPressureSystolic: [120, [Validators.required, Validators.min(50)]],
    bloodPressureDiastolic: [80, [Validators.required, Validators.min(30)]],
    heartRateBpm: [72, [Validators.required, Validators.min(20)]],
    bloodGlucoseMmol: [5.5],
    hba1cPercent: [5.7],
    weightKg: [70],
    temperatureC: [36.6],
    oxygenSaturation: [98],
    notes: ['']
  });

  public rxForm: FormGroup = this.fb.group({
    validUntil: ['', [Validators.required]],
    diagnosisNotes: ['', [Validators.required]],
    pharmacistNotes: ['']
  });

  // Prescription Items sub-state
  public createdRxId = '';
  public rxItemForm: FormGroup = this.fb.group({
    drugName: ['', [Validators.required]],
    dosage: ['', [Validators.required]],
    route: ['ORAL', [Validators.required]],
    frequency: ['1x daily', [Validators.required]],
    durationDays: [7, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    refillsAllowed: [0],
    specialInstructions: ['']
  });
  public rxItemsList: PrescriptionItemResponseDto[] = [];

  public labForm: FormGroup = this.fb.group({
    labName: ['', [Validators.required]],
    reportType: ['', [Validators.required]],
    reportDate: ['', [Validators.required]],
    status: [LabResultStatus.PENDING, [Validators.required]],
    overallFlag: [ResultFlag.NORMAL, [Validators.required]],
    doctorAnnotation: ['']
  });
  public selectedFile: File | null = null;

  ngOnInit(): void {
    this.loadDoctorPatients();
  }

  loadDoctorPatients(): void {
    this.uiService.showLoading();
    const map = new Map<string, string>();

    const updateList = () => {
      this.patientList = Array.from(map.entries()).map(([patientId, patientName]) => ({
        patientId,
        patientName
      }));
      this.uiService.hideLoading();
    };

    // 1. Fetch patients from appointments
    this.appointmentService.getDoctorUpcomingAppointments().subscribe({
      next: (apps) => {
        if (apps && Array.isArray(apps)) {
          for (const app of apps) {
            if (app.patientId && app.patientName) {
              map.set(app.patientId, app.patientName);
            }
          }
          updateList();
        }
      },
      error: () => updateList()
    });

    // 2. Fetch patients from tele-consultations
    this.consultationService.getMyDoctorConsultations(0, 100).subscribe({
      next: (page) => {
        const consultations = page.content || [];
        for (const c of consultations) {
          if (c.patientId && c.patientName) {
            map.set(c.patientId, c.patientName);
          }
        }
        updateList();
      },
      error: () => {
        const user = this.authService.currentUser();
        this.doctorService.getAllDoctors().subscribe({
          next: (docs) => {
            const doc = docs.find((d: any) => 
              (user?.userId && d.userId === user.userId) ||
              (user?.fullName && d.fullName?.toLowerCase() === user.fullName?.toLowerCase())
            );
            if (doc && doc.doctorId) {
              this.consultationService.getConsultationsByDoctor(doc.doctorId, 0, 100).subscribe({
                next: (page) => {
                  const consultations = page.content || [];
                  for (const c of consultations) {
                    if (c.patientId && c.patientName) {
                      map.set(c.patientId, c.patientName);
                    }
                  }
                  updateList();
                }
              });
            } else {
              updateList();
            }
          },
          error: () => updateList()
        });
      }
    });
  }

  onPatientChartChange(patientId: any): void {
    this.selectedPatientId = typeof patientId === 'string' ? patientId : (patientId?.value || '');
    const opt = this.patientList.find(p => p.patientId === this.selectedPatientId);
    this.selectedPatientName = opt ? opt.patientName : '';

    if (!this.selectedPatientId) {
      this.clearPatientDetails();
      return;
    }

    this.loadPatientEMR();
  }

  onPatientSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedPatientId = val;
    const opt = this.patientList.find(p => p.patientId === val);
    this.selectedPatientName = opt ? opt.patientName : '';

    if (!val) {
      this.clearPatientDetails();
      return;
    }

    this.loadPatientEMR();
  }

  clearPatientDetails(): void {
    this.healthProfile = null;
    this.allergies = [];
    this.chronicConditions = [];
    this.prescriptions = [];
    this.selectedRxItems = {};
    this.vitals = [];
    this.labResults = [];
  }

  loadPatientEMR(): void {
    this.uiService.showLoading();
    const patientId = this.selectedPatientId;

    // Load Health Profile
    this.patientService.getPatientHealthProfile(patientId).subscribe({
      next: (profile) => this.healthProfile = profile,
      error: () => this.healthProfile = null
    });

    // Load Allergies
    this.patientService.getPatientAllergies(patientId).subscribe({
      next: (data) => this.allergies = data,
      error: () => this.allergies = []
    });

    // Load Conditions
    this.patientService.getPatientChronicConditions(patientId).subscribe({
      next: (data) => this.chronicConditions = data,
      error: () => this.chronicConditions = []
    });

    // Load Vitals
    this.clinicalRecordService.searchVitals({ patientId, page: 0, size: 20 }).subscribe({
      next: (page) => this.vitals = page.content,
      error: () => this.vitals = []
    });

    // Load Labs
    this.clinicalRecordService.searchLabResults({ patientId, page: 0, size: 20 }).subscribe({
      next: (page) => this.labResults = page.content,
      error: () => this.labResults = []
    });

    // Load Prescriptions
    this.clinicalRecordService.searchPrescriptions({ patientId, page: 0, size: 20 }).subscribe({
      next: (page) => {
        this.prescriptions = page.content;
        this.uiService.hideLoading();
        // Load items for each prescription
        for (const rx of this.prescriptions) {
          this.clinicalRecordService.getPrescriptionItems(rx.prescriptionId).subscribe({
            next: (items) => this.selectedRxItems[rx.prescriptionId] = items
          });
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  // ── Modals Trigger ──────────────────────────────────────────────────
  openModal(type: 'vital' | 'prescription' | 'lab'): void {
    this.activeModal = type;
    this.createdRxId = '';
    this.rxItemsList = [];
    this.selectedFile = null;

    if (type === 'vital') {
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
    } else if (type === 'prescription') {
      this.rxForm.reset();
      this.rxItemForm.reset({ route: 'ORAL', frequency: '1x daily', durationDays: 7, quantity: 1, refillsAllowed: 0 });
    } else if (type === 'lab') {
      this.labForm.reset({ status: LabResultStatus.PENDING, overallFlag: ResultFlag.NORMAL });
    }
  }

  closeModal(): void {
    this.activeModal = null;
  }

  // ── Submit Handlers ────────────────────────────────────────────────
  submitVital(): void {
    if (this.vitalForm.invalid) return;
    this.uiService.showLoading();
    const payload = {
      ...this.vitalForm.value,
      patientId: this.selectedPatientId,
      recordedAt: new Date().toISOString(),
      source: VitalSource.DOCTOR_ENTRY
    };

    this.clinicalRecordService.createVital(payload).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Vital logged.');
        this.closeModal();
        this.loadPatientEMR();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to record vitals.');
      }
    });
  }

  submitPrescription(): void {
    if (this.rxForm.invalid) return;
    this.uiService.showLoading();
    const payload = {
      ...this.rxForm.value,
      patientId: this.selectedPatientId,
      status: PrescriptionStatus.ACTIVE,
      issuedDate: new Date().toISOString().split('T')[0]
    };

    this.clinicalRecordService.createPrescription(payload).subscribe({
      next: (rx) => {
        this.uiService.hideLoading();
        this.createdRxId = rx.prescriptionId;
        this.uiService.showSuccess('Prescription shell created. Now add items.');
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to create prescription.');
      }
    });
  }

  addRxItem(): void {
    if (this.rxItemForm.invalid || !this.createdRxId) return;
    this.uiService.showLoading();
    this.clinicalRecordService.addPrescriptionItem(this.createdRxId, this.rxItemForm.value).subscribe({
      next: (item) => {
        this.uiService.hideLoading();
        this.rxItemsList.push(item);
        this.rxItemForm.reset({ route: 'ORAL', frequency: '1x daily', durationDays: 7, quantity: 1, refillsAllowed: 0 });
        this.uiService.showSuccess('Prescription item added.');
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to add prescription item.');
      }
    });
  }

  finishPrescription(): void {
    this.closeModal();
    this.loadPatientEMR();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
    }
  }

  submitLab(): void {
    if (this.labForm.invalid) return;
    this.uiService.showLoading();
    const payload = {
      ...this.labForm.value,
      patientId: this.selectedPatientId
    };
    this.clinicalRecordService.createLabResult(payload, this.selectedFile || undefined).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Lab result uploaded.');
        this.closeModal();
        this.loadPatientEMR();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to upload lab report.');
      }
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
        console.error('Failed to download lab attachment:', err);
        this.uiService.showError('Could not download lab report file.');
      }
    });
  }
}
