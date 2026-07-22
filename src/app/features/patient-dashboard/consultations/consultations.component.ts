import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultationService } from '../../../core/services/consultation.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import { ConsultationResponseDto, ConsultationMessageResponseDto, MessageType } from '../../../core/models/consultation.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './consultations.component.html',
  styleUrls: [] // will use standard global styles for UI (glassmorphism/premium design if possible)
})
export class ConsultationsComponent implements OnInit, OnDestroy {
  private consultationService = inject(ConsultationService);
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);

  public consultations: ConsultationResponseDto[] = [];
  public selectedConsultation: ConsultationResponseDto | null = null;
  public messages: ConsultationMessageResponseDto[] = [];
  public doctors: any[] = [];
  
  public patientId: string = '';

  // Forms
  public messageForm: FormGroup = this.fb.group({
    body: ['', Validators.required]
  });

  public bookForm: FormGroup = this.fb.group({
    doctorId: ['', Validators.required],
    subject: ['', [Validators.required, Validators.maxLength(255)]],
    isUrgent: [false]
  });

  public showBookModal = false;

  private pollInterval: any;

  ngOnInit(): void {
    this.loadPatientProfile();
    this.loadDoctors();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadPatientProfile(): void {
    this.uiService.showLoading();
    this.patientService.getMyProfile().subscribe({
      next: (profile) => {
        this.patientId = profile.patientId;
        this.loadConsultations();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Could not load patient profile.');
      }
    });
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        this.doctors = docs;
      }
    });
  }

  loadConsultations(): void {
    if (!this.patientId) return;
    this.consultationService.getConsultationsByPatient(this.patientId, 0, 50).subscribe({
      next: (page) => {
        this.consultations = page.content || [];
        this.uiService.hideLoading();
        if (this.consultations.length > 0 && !this.selectedConsultation) {
          this.selectConsultation(this.consultations[0]);
        }
      },
      error: () => this.uiService.hideLoading()
    });
  }

  selectConsultation(c: ConsultationResponseDto): void {
    this.selectedConsultation = c;
    this.loadMessages(c.consultationId);
    this.startPolling(c.consultationId);
  }

  loadMessages(consultationId: string, isPolling = false): void {
    if (!isPolling) this.uiService.showLoading();
    this.consultationService.getMessagesForConsultation(consultationId).subscribe({
      next: (msgs) => {
        const isNewMessage = this.messages.length !== msgs.length;
        this.messages = msgs;
        if (!isPolling) this.uiService.hideLoading();
        
        if (!isPolling || isNewMessage) {
           this.scrollToBottom();
        }
      },
      error: () => {
        if (!isPolling) this.uiService.hideLoading();
      }
    });
  }

  startPolling(consultationId: string): void {
    this.stopPolling();
    this.pollInterval = setInterval(() => {
      this.loadMessages(consultationId, true);
    }, 3000); // poll every 3 seconds
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  sendMessage(): void {
    if (this.messageForm.invalid || !this.selectedConsultation) return;

    const body = this.messageForm.value.body;
    this.consultationService.sendMessage({
      consultationId: this.selectedConsultation.consultationId,
      messageType: MessageType.TEXT,
      body: body
    }).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.messageForm.reset();
        this.scrollToBottom();
      },
      error: () => this.uiService.showError('Failed to send message')
    });
  }

  openBookModal(): void {
    this.bookForm.reset({ isUrgent: false });
    this.showBookModal = true;
  }

  closeBookModal(): void {
    this.showBookModal = false;
  }

  submitBookConsultation(): void {
    if (this.bookForm.invalid || !this.patientId) {
      this.bookForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    const val = this.bookForm.value;
    
    this.consultationService.bookConsultation({
      patientId: this.patientId,
      doctorId: val.doctorId,
      subject: val.subject,
      isUrgent: val.isUrgent
    }).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Consultation booked successfully!');
        this.closeBookModal();
        this.loadConsultations();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to book consultation.');
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
