import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultationService } from '../../../../core/services/consultation.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { UiService } from '../../../../core/services/ui.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ClinicalRecordService } from '../../../../core/services/clinical-record.service';
import { 
  ConsultationResponseDto, 
  ConsultationMessageResponseDto, 
  ConsultationStatus, 
  MessageType 
} from '../../../../core/models/consultation.model';
import { CustomSelectComponent } from '../../../../shared/components/custom-select/custom-select.component';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../../shared/pipes/api-url.pipe';
import { PatientService } from '../../../../core/services/patient.service';
import {
  LabResultResponseDto,
  LabResultStatus,
  ResultFlag,
  LabItemResponseDto,
  LabItemFlag
} from '../../../../core/models/clinical-record.model';

import { FileService, FileMetadataResponseDto } from '../../../../core/services/file.service';
import { WebSocketService } from '../../../../core/services/websocket.service';
import { of, catchError, Subscription } from 'rxjs';

@Component({
  selector: 'app-doctor-consultations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CustomSelectComponent, TranslatePipe, ApiUrlPipe],
  templateUrl: './doctor-consultations.component.html',
  styleUrls: ['./doctor-consultations.component.css']
})
export class DoctorConsultationsComponent implements OnInit, OnDestroy {
  private consultationService = inject(ConsultationService);
  private doctorService = inject(DoctorService);
  private uiService = inject(UiService);
  public authService = inject(AuthService);
  private patientService = inject(PatientService);
  private clinicalRecordService = inject(ClinicalRecordService);
  public fileService = inject(FileService);
  public webSocketService = inject(WebSocketService);
  private fb = inject(FormBuilder);
  public languageService = inject(LanguageService);

  public doctorId: string = '';
  public consultations: ConsultationResponseDto[] = [];
  public selectedConsultation: ConsultationResponseDto | null = null;
  public messages: ConsultationMessageResponseDto[] = [];
  public patientHealthProfile: any = null;
  public patientAllergies: any[] = [];
  public patientChronicConditions: any[] = [];
  public showPatientInfo: boolean = false;
  public isChatActive: boolean = false;
  public searchQuery: string = '';

  // File Sharing State
  public selectedChatFile: File | null = null;
  public isUploadingFile = false;
  public fileMetadataCache: { [fileId: string]: FileMetadataResponseDto } = {};
  public fileBlobUrlMap: { [fileId: string]: string } = {};
  public fileBlobTypeMap: { [fileId: string]: string } = {};
  public previewImageUrl: string | null = null;
  public previewImageTitle: string = '';
  public previewFileId: string | null = null;

  isImageFile(msg: ConsultationMessageResponseDto): boolean {
    if (!msg.fileId) return false;
    if (this.fileBlobTypeMap[msg.fileId]?.startsWith('image/')) {
      return true;
    }
    const meta = msg.fileMetadata || this.fileMetadataCache[msg.fileId];
    if (meta?.mimeType) {
      return meta.mimeType.startsWith('image/');
    }
    if (meta?.originalFilename) {
      return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(meta.originalFilename);
    }
    if (msg.body) {
      return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(msg.body);
    }
    return false;
  }

  ensureFileBlob(fileId: string): void {
    if (!fileId || this.fileBlobUrlMap[fileId]) return;
    this.fileService.downloadFile(fileId).pipe(catchError(() => of(null))).subscribe(blob => {
      if (blob) {
        this.fileBlobTypeMap[fileId] = blob.type;
        this.fileBlobUrlMap[fileId] = window.URL.createObjectURL(blob);
      }
    });
  }

  openImageModal(url: string, title?: string, fileId?: string): void {
    this.previewImageUrl = url;
    this.previewImageTitle = title || 'Image Preview';
    this.previewFileId = fileId || null;
  }

  closeImageModal(): void {
    this.previewImageUrl = null;
    this.previewImageTitle = '';
    this.previewFileId = null;
  }

  get filteredConsultations() {
    if (!this.searchQuery.trim()) {
      return this.consultations;
    }
    const query = this.searchQuery.toLowerCase();
    return this.consultations.filter(c => 
      c.patientName?.toLowerCase().includes(query) ||
      c.subject?.toLowerCase().includes(query)
    );
  }

  // ── Prescription State ─────────────────────────────────────────────
  public showPrescriptionPanel: boolean = false;
  public prescriptions: any[] = [];
  public selectedPrescription: any = null;
  public prescriptionItems: any[] = [];
  public isCreatingPrescription: boolean = false;
  public isAddingItem: boolean = false;

  // ── Lab Results State ──────────────────────────────────────────────
  public showLabPanel: boolean = false;
  public labResults: LabResultResponseDto[] = [];
  public selectedLabResult: LabResultResponseDto | null = null;
  public labItems: LabItemResponseDto[] = [];
  public isCreatingLabResult: boolean = false;
  public isAddingLabItem: boolean = false;
  public selectedLabFile: File | null = null;

  public messageForm: FormGroup = this.fb.group({
    body: ['']
  });

  public statusForm: FormGroup = this.fb.group({
    status: ['', Validators.required]
  });

  // Prescription header form
  public prescriptionForm: FormGroup = this.fb.group({
    issuedDate: [new Date().toISOString().split('T')[0], Validators.required],
    validUntil: [''],
    diagnosisNotes: [''],
    pharmacistNotes: [''],
    status: ['ACTIVE']
  });

  // Medication item form
  public itemForm: FormGroup = this.fb.group({
    drugName: ['', Validators.required],
    dosage: ['', Validators.required],
    route: ['ORAL'],
    frequency: ['', Validators.required],
    durationDays: [7, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    refillsAllowed: [0],
    specialInstructions: ['']
  });

  // Lab Result Form
  public labForm: FormGroup = this.fb.group({
    labName: ['', Validators.required],
    reportType: ['', Validators.required],
    reportDate: [new Date().toISOString().split('T')[0], Validators.required],
    status: [LabResultStatus.RECEIVED, Validators.required],
    overallFlag: [ResultFlag.NORMAL, Validators.required],
    doctorAnnotation: ['']
  });

  // Lab Item Form
  public labItemForm: FormGroup = this.fb.group({
    testName: ['', Validators.required],
    value: ['', Validators.required],
    unit: ['', Validators.required],
    flag: [LabItemFlag.NORMAL, Validators.required],
    loincCode: [''],
    referenceLow: [null],
    referenceHigh: [null]
  });

  get routeOptions() {
    return [
      { label: this.languageService.translate('Oral', 'فموي'), value: 'ORAL' },
      { label: this.languageService.translate('Intravenous (IV)', 'وريدي (IV)'), value: 'IV' },
      { label: this.languageService.translate('Intramuscular (IM)', 'عضلي (IM)'), value: 'IM' },
      { label: this.languageService.translate('Subcutaneous (SC)', 'تحت الجلد (SC)'), value: 'SC' },
      { label: this.languageService.translate('Topical', 'موضعي'), value: 'TOPICAL' },
      { label: this.languageService.translate('Inhaled', 'استنشاق'), value: 'INHALED' },
      { label: this.languageService.translate('Sublingual', 'تحت اللسان'), value: 'SUBLINGUAL' },
      { label: this.languageService.translate('Rectal', 'شرجي'), value: 'RECTAL' },
      { label: this.languageService.translate('Ophthalmic', 'عيني'), value: 'OPHTHALMIC' },
      { label: this.languageService.translate('Nasal', 'أنفي'), value: 'NASAL' }
    ];
  }

  get labStatusSelectOptions() {
    return [
      { label: this.languageService.translate('Pending', 'معلق'), value: 'PENDING' },
      { label: this.languageService.translate('Received', 'مستلم'), value: 'RECEIVED' },
      { label: this.languageService.translate('Reviewed', 'تمت المراجعة'), value: 'REVIEWED' },
      { label: this.languageService.translate('Abnormal', 'غير طبيعي'), value: 'ABNORMAL' },
      { label: this.languageService.translate('Critical', 'حرج'), value: 'CRITICAL' }
    ];
  }

  get labOverallFlagOptions() {
    return [
      { label: this.languageService.translate('Normal', 'طبيعي'), value: 'NORMAL' },
      { label: this.languageService.translate('Abnormal', 'غير طبيعي'), value: 'ABNORMAL' },
      { label: this.languageService.translate('Critical', 'حرج'), value: 'CRITICAL' }
    ];
  }

  get labItemFlagOptions() {
    return [
      { label: this.languageService.translate('Normal', 'طبيعي'), value: 'NORMAL' },
      { label: this.languageService.translate('High', 'مرتفع'), value: 'HIGH' },
      { label: this.languageService.translate('Low', 'منخفض'), value: 'LOW' },
      { label: this.languageService.translate('Critical High', 'مرتفع جداً حرج'), value: 'CRITICAL_HIGH' },
      { label: this.languageService.translate('Critical Low', 'منخفض جداً حرج'), value: 'CRITICAL_LOW' },
      { label: this.languageService.translate('Abnormal', 'غير طبيعي'), value: 'ABNORMAL' }
    ];
  }

  public statusOptions = Object.values(ConsultationStatus);

  get statusSelectOptions() {
    return this.statusOptions.map(s => ({
      label: this.languageService.translate(s.replace(/_/g, ' '), this.getStatusAr(s)),
      value: s
    }));
  }

  getStatusAr(status: string): string {
    const map: { [key: string]: string } = {
      'OPEN': 'مفتوحة',
      'IN_PROGRESS': 'قيد العلاج',
      'WAITING_FOR_PATIENT': 'في انتظار المريض',
      'RESOLVED': 'تم الحل',
      'CLOSED': 'مغلقة',
      'CANCELLED': 'ملغاة'
    };
    return map[status] || status;
  }

  private chatSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.loadConsultations();
  }

  ngOnDestroy(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = null;
    }
    Object.values(this.fileBlobUrlMap).forEach(url => {
      if (url) window.URL.revokeObjectURL(url);
    });
  }

  loadConsultations(): void {
    this.uiService.showLoading();
    // 1. Try dedicated endpoint first
    this.consultationService.getMyDoctorConsultations(0, 50).subscribe({
      next: (page) => {
        this.handleConsultationsLoaded(page);
      },
      error: () => {
        // 2. Fallback to doctor lookup + getConsultationsByDoctor for older backend instances
        this.fallbackResolveAndLoadConsultations();
      }
    });
  }

  fallbackResolveAndLoadConsultations(): void {
    const user = this.authService.currentUser();
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        const doc = docs.find((d: any) => 
          (user?.userId && d.userId === user.userId) ||
          (user?.fullName && d.fullName?.toLowerCase() === user.fullName?.toLowerCase())
        );

        if (doc && doc.doctorId) {
          this.doctorId = doc.doctorId;
          this.consultationService.getConsultationsByDoctor(this.doctorId, 0, 50).subscribe({
            next: (page) => this.handleConsultationsLoaded(page),
            error: () => this.uiService.hideLoading()
          });
        } else {
          this.uiService.hideLoading();
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  handleConsultationsLoaded(page: any): void {
    this.consultations = page.content || [];
    this.uiService.hideLoading();
    if (this.consultations.length > 0 && !this.selectedConsultation) {
      this.selectConsultation(this.consultations[0]);
    }
  }

  selectConsultation(c: ConsultationResponseDto): void {
    this.selectedConsultation = c;
    this.statusForm.patchValue({ status: c.status });
    this.loadMessages(c.consultationId);
    this.setupWebSocketSubscription(c.consultationId);
    this.loadPatientDetails(c.patientId);
    this.loadLabResults();
    this.isChatActive = true;
    this.showPatientInfo = false;
  }

  togglePatientInfo(): void {
    this.showPatientInfo = !this.showPatientInfo;
  }

  backToInbox(): void {
    this.isChatActive = false;
    this.showPrescriptionPanel = false;
    this.showLabPanel = false;
  }

  // ── Prescription Methods ───────────────────────────────────────────
  togglePrescriptionPanel(): void {
    this.showPrescriptionPanel = !this.showPrescriptionPanel;
    if (this.showPrescriptionPanel && this.selectedConsultation) {
      this.loadPrescriptions();
      this.showPatientInfo = false;
    }
  }

  loadPrescriptions(): void {
    if (!this.selectedConsultation) return;
    this.clinicalRecordService.searchPrescriptions({
      patientId: this.selectedConsultation.patientId,
      page: 0,
      size: 20
    }).subscribe({
      next: (page: any) => {
        // Filter to this consultation if consultationId is available
        const all = page.content || [];
        this.prescriptions = all.filter((rx: any) =>
          rx.consultationId === this.selectedConsultation!.consultationId ||
          !rx.consultationId
        );
        // Auto-select first
        if (this.prescriptions.length > 0 && !this.selectedPrescription) {
          this.selectPrescription(this.prescriptions[0]);
        }
      },
      error: () => this.prescriptions = []
    });
  }

  selectPrescription(rx: any): void {
    this.selectedPrescription = rx;
    this.isCreatingPrescription = false;
    this.isAddingItem = false;
    this.loadPrescriptionItems(rx.prescriptionId);
  }

  loadPrescriptionItems(prescriptionId: string): void {
    this.clinicalRecordService.getPrescriptionItems(prescriptionId).subscribe({
      next: (items) => this.prescriptionItems = items,
      error: () => this.prescriptionItems = []
    });
  }

  startNewPrescription(): void {
    this.isCreatingPrescription = true;
    this.selectedPrescription = null;
    this.prescriptionItems = [];
    this.prescriptionForm.reset({
      issuedDate: new Date().toISOString().split('T')[0],
      validUntil: '',
      diagnosisNotes: '',
      pharmacistNotes: '',
      status: 'ACTIVE'
    });
  }

  submitPrescription(): void {
    if (this.prescriptionForm.invalid || !this.selectedConsultation) return;
    this.uiService.showLoading();

    const payload: any = {
      ...this.prescriptionForm.value,
      patientId: this.selectedConsultation.patientId,
      consultationId: this.selectedConsultation.consultationId
    };
    if (!payload.validUntil) delete payload.validUntil;

    this.clinicalRecordService.createPrescription(payload).subscribe({
      next: (rx) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Prescription created successfully.');
        this.isCreatingPrescription = false;
        this.prescriptions = [rx, ...this.prescriptions];
        this.selectPrescription(rx);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to create prescription.');
      }
    });
  }

  startAddItem(): void {
    this.isAddingItem = true;
    this.itemForm.reset({
      drugName: '',
      dosage: '',
      route: 'ORAL',
      frequency: '',
      durationDays: 7,
      quantity: 1,
      refillsAllowed: 0,
      specialInstructions: ''
    });
  }

  submitItem(): void {
    if (this.itemForm.invalid || !this.selectedPrescription) return;
    this.uiService.showLoading();

    this.clinicalRecordService.addPrescriptionItem(
      this.selectedPrescription.prescriptionId,
      this.itemForm.value
    ).subscribe({
      next: (item) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Medication added.');
        this.prescriptionItems = [...this.prescriptionItems, item];
        this.isAddingItem = false;
        this.itemForm.reset({ route: 'ORAL', durationDays: 7, quantity: 1, refillsAllowed: 0 });
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to add medication.');
      }
    });
  }

  deleteItem(itemId: string): void {
    if (!confirm('Remove this medication from the prescription?')) return;
    this.uiService.showLoading();
    this.clinicalRecordService.deletePrescriptionItem(itemId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Medication removed.');
        this.prescriptionItems = this.prescriptionItems.filter(i => i.itemId !== itemId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove medication.');
      }
    });
  }

  deletePrescription(prescriptionId: string): void {
    if (!confirm('Delete this entire prescription?')) return;
    this.uiService.showLoading();
    this.clinicalRecordService.deletePrescription(prescriptionId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Prescription deleted.');
        this.prescriptions = this.prescriptions.filter(rx => rx.prescriptionId !== prescriptionId);
        this.selectedPrescription = null;
        this.prescriptionItems = [];
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to delete prescription.');
      }
    });
  }

  closePrescriptionPanel(): void {
    this.showPrescriptionPanel = false;
    this.isCreatingPrescription = false;
    this.isAddingItem = false;
    this.selectedPrescription = null;
    this.prescriptionItems = [];
  }

  loadPatientDetails(patientId: string): void {
    this.patientHealthProfile = null;
    this.patientAllergies = [];
    this.patientChronicConditions = [];

    this.patientService.getPatientHealthProfile(patientId).subscribe({
      next: (profile) => this.patientHealthProfile = profile,
      error: () => this.patientHealthProfile = null
    });

    this.patientService.getPatientAllergies(patientId).subscribe({
      next: (allergies) => this.patientAllergies = allergies,
      error: () => this.patientAllergies = []
    });

    this.patientService.getPatientChronicConditions(patientId).subscribe({
      next: (conditions) => this.patientChronicConditions = conditions,
      error: () => this.patientChronicConditions = []
    });
  }

  loadMessages(consultationId: string): void {
    this.uiService.showLoading();
    this.consultationService.getMessagesForConsultation(consultationId).subscribe({
      next: (msgs) => {
        this.messages = msgs || [];
        this.messages.forEach(m => {
          if (m.fileId) {
            this.ensureFileBlob(m.fileId);
            if (this.fileMetadataCache[m.fileId]) {
              m.fileMetadata = this.fileMetadataCache[m.fileId];
            } else {
              this.fileService.getFileMetadata(m.fileId).pipe(catchError(() => of(null))).subscribe(meta => {
                if (meta) {
                  this.fileMetadataCache[m.fileId!] = meta;
                  m.fileMetadata = meta;
                }
              });
            }
          }
        });
        this.uiService.hideLoading();
        this.scrollToBottom();
      },
      error: () => {
        this.uiService.hideLoading();
      }
    });
  }

  setupWebSocketSubscription(consultationId: string): void {
    if (this.chatSubscription) {
      try {
        this.chatSubscription.unsubscribe();
      } catch (e) {}
      this.chatSubscription = null;
    }
    try {
      this.chatSubscription = this.webSocketService.watchConsultation(consultationId).subscribe({
        next: (msg: ConsultationMessageResponseDto) => {
          if (msg && msg.consultationId === this.selectedConsultation?.consultationId) {
            const exists = this.messages.some(m => m.messageId === msg.messageId);
            if (!exists) {
              if (msg.fileId) {
                this.ensureFileBlob(msg.fileId);
                if (this.fileMetadataCache[msg.fileId]) {
                  msg.fileMetadata = this.fileMetadataCache[msg.fileId];
                } else {
                  this.fileService.getFileMetadata(msg.fileId).pipe(catchError(() => of(null))).subscribe(meta => {
                    if (meta) {
                      this.fileMetadataCache[msg.fileId!] = meta;
                      msg.fileMetadata = meta;
                    }
                  });
                }
              }
              this.messages.push(msg);
              this.scrollToBottom();
            }
          }
        },
        error: (err) => {
          console.warn('STOMP subscription error:', err);
        }
      });
    } catch (e) {
      console.warn('Failed to setup STOMP subscription:', e);
    }
  }

  onChatFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedChatFile = input.files[0];
    }
  }

  clearSelectedChatFile(inputRef?: HTMLInputElement): void {
    this.selectedChatFile = null;
    if (inputRef) {
      inputRef.value = '';
    }
  }

  sendMessage(fileInput?: HTMLInputElement): void {
    if (!this.selectedConsultation) return;
    const body = this.messageForm.value.body?.trim();
    if (!body && !this.selectedChatFile) return;

    if (this.selectedChatFile) {
      const tempFile = this.selectedChatFile;
      this.isUploadingFile = true;
      this.uiService.showLoading();
      this.fileService.uploadChatFile(tempFile, this.selectedConsultation.patientId).subscribe({
        next: (fileMeta) => {
          this.fileMetadataCache[fileMeta.fileId] = fileMeta;
          if (tempFile.type) {
            this.fileBlobTypeMap[fileMeta.fileId] = tempFile.type;
          }
          this.fileBlobUrlMap[fileMeta.fileId] = window.URL.createObjectURL(tempFile);

          this.consultationService.sendMessage({
            consultationId: this.selectedConsultation!.consultationId,
            messageType: MessageType.FILE,
            fileId: fileMeta.fileId,
            body: body || fileMeta.originalFilename || 'Sent an attachment'
          }).subscribe({
            next: (msg) => {
              this.uiService.hideLoading();
              this.isUploadingFile = false;
              msg.fileMetadata = fileMeta;
              this.ensureFileBlob(fileMeta.fileId);
              const exists = this.messages.some(m => m.messageId === msg.messageId);
              if (!exists) {
                this.messages.push(msg);
              }
              this.messageForm.reset();
              this.clearSelectedChatFile(fileInput);
              this.scrollToBottom();
            },
            error: () => {
              this.uiService.hideLoading();
              this.isUploadingFile = false;
              this.uiService.showError('Failed to send attachment message.');
            }
          });
        },
        error: () => {
          this.uiService.hideLoading();
          this.isUploadingFile = false;
          this.uiService.showError('Failed to upload file attachment.');
        }
      });
    } else {
      if (!body) return;
      this.consultationService.sendMessage({
        consultationId: this.selectedConsultation.consultationId,
        messageType: MessageType.TEXT,
        body: body
      }).subscribe({
        next: (msg) => {
          const exists = this.messages.some(m => m.messageId === msg.messageId);
          if (!exists) {
            this.messages.push(msg);
          }
          this.messageForm.reset();
          this.scrollToBottom();
        },
        error: () => this.uiService.showError('Failed to send message')
      });
    }
  }

  downloadChatFile(fileId: string, filename?: string): void {
    if (!fileId) return;
    this.uiService.showLoading();
    this.fileService.downloadFile(fileId).subscribe({
      next: (blob: Blob) => {
        this.uiService.hideLoading();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || `attachment_${fileId.substring(0, 8)}`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to download file attachment.');
      }
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'File';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  updateStatus(): void {
    if (this.statusForm.invalid || !this.selectedConsultation) return;

    const newStatus = this.statusForm.value.status;
    this.uiService.showLoading();
    this.consultationService.updateStatus(this.selectedConsultation.consultationId, { status: newStatus }).subscribe({
      next: (updated) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Consultation status updated.');
        this.selectedConsultation = updated;
        const idx = this.consultations.findIndex(c => c.consultationId === updated.consultationId);
        if (idx !== -1) {
          this.consultations[idx] = updated;
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to update status.');
      }
    });
  }

  // ── Lab Results Methods ─────────────────────────────────────────────
  toggleLabPanel(): void {
    this.showLabPanel = !this.showLabPanel;
    if (this.showLabPanel && this.selectedConsultation) {
      this.loadLabResults();
      this.showPatientInfo = false;
      this.showPrescriptionPanel = false;
    }
  }

  loadLabResults(): void {
    if (!this.selectedConsultation) return;
    this.clinicalRecordService.searchLabResults({
      patientId: this.selectedConsultation.patientId,
      page: 0,
      size: 20
    }).subscribe({
      next: (page: any) => {
        this.labResults = page.content || [];
        if (this.labResults.length > 0 && !this.selectedLabResult) {
          this.selectLabResult(this.labResults[0]);
        }
      },
      error: () => this.labResults = []
    });
  }

  selectLabResult(lab: any): void {
    this.selectedLabResult = lab;
    this.isCreatingLabResult = false;
    this.isAddingLabItem = false;
    this.loadLabItems(lab.labResultId);
  }

  loadLabItems(labResultId: string): void {
    this.clinicalRecordService.getLabItems(labResultId).subscribe({
      next: (items) => this.labItems = items || [],
      error: () => this.labItems = []
    });
  }

  startNewLabResult(): void {
    this.isCreatingLabResult = true;
    this.selectedLabResult = null;
    this.labItems = [];
    this.selectedLabFile = null;
    this.labForm.reset({
      labName: '',
      reportType: '',
      reportDate: new Date().toISOString().split('T')[0],
      status: LabResultStatus.RECEIVED,
      overallFlag: ResultFlag.NORMAL,
      doctorAnnotation: ''
    });
  }

  onLabFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedLabFile = target.files[0];
    }
  }

  submitLabResult(): void {
    if (this.labForm.invalid || !this.selectedConsultation) return;
    this.uiService.showLoading();

    const payload = {
      ...this.labForm.value,
      patientId: this.selectedConsultation.patientId
    };

    this.clinicalRecordService.createLabResult(payload, this.selectedLabFile || undefined).subscribe({
      next: (lab) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Lab result created successfully.');
        this.isCreatingLabResult = false;
        this.labResults = [lab, ...this.labResults];
        this.selectLabResult(lab);
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to create lab result.');
      }
    });
  }

  startAddLabItem(): void {
    this.isAddingLabItem = true;
    this.labItemForm.reset({
      testName: '',
      value: '',
      unit: '',
      flag: LabItemFlag.NORMAL,
      loincCode: '',
      referenceLow: null,
      referenceHigh: null
    });
  }

  submitLabItem(): void {
    if (this.labItemForm.invalid || !this.selectedLabResult) return;
    this.uiService.showLoading();

    this.clinicalRecordService.addLabItem(
      this.selectedLabResult.labResultId,
      this.labItemForm.value
    ).subscribe({
      next: (item) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Lab item added.');
        this.labItems = [...this.labItems, item];
        this.isAddingLabItem = false;
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to add lab item.');
      }
    });
  }

  deleteLabItem(itemId: string): void {
    if (!confirm('Remove this test item from the lab report?')) return;
    this.uiService.showLoading();
    this.clinicalRecordService.deleteLabItem(itemId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Lab item removed.');
        this.labItems = this.labItems.filter(i => i.itemId !== itemId);
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to remove lab item.');
      }
    });
  }

  deleteLabResult(labResultId: string): void {
    if (!confirm('Delete this entire lab result?')) return;
    this.uiService.showLoading();
    this.clinicalRecordService.deleteLabResult(labResultId).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Lab result deleted.');
        this.labResults = this.labResults.filter(lab => lab.labResultId !== labResultId);
        this.selectedLabResult = null;
        this.labItems = [];
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to delete lab result.');
      }
    });
  }

  downloadLabResultFile(fileId: string): void {
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

  closeLabPanel(): void {
    this.showLabPanel = false;
    this.isCreatingLabResult = false;
    this.isAddingLabItem = false;
    this.selectedLabResult = null;
    this.labItems = [];
    this.selectedLabFile = null;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('doctor-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
