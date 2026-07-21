import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultationService } from '../../../../core/services/consultation.service';
import { DoctorService } from '../../../../core/services/doctor.service';
import { UiService } from '../../../../core/services/ui.service';
import { AuthService } from '../../../../core/services/auth.service';
import { 
  ConsultationResponseDto, 
  ConsultationMessageResponseDto, 
  ConsultationStatus, 
  MessageType 
} from '../../../../core/models/consultation.model';

@Component({
  selector: 'app-doctor-consultations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './doctor-consultations.component.html',
  styleUrls: []
})
export class DoctorConsultationsComponent implements OnInit, OnDestroy {
  private consultationService = inject(ConsultationService);
  private doctorService = inject(DoctorService);
  private uiService = inject(UiService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  public doctorId: string = '';
  public consultations: ConsultationResponseDto[] = [];
  public selectedConsultation: ConsultationResponseDto | null = null;
  public messages: ConsultationMessageResponseDto[] = [];

  public messageForm: FormGroup = this.fb.group({
    body: ['', Validators.required]
  });

  public statusForm: FormGroup = this.fb.group({
    status: ['', Validators.required]
  });

  public statusOptions = Object.values(ConsultationStatus);

  private pollInterval: any;

  ngOnInit(): void {
    this.resolveDoctorId();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  resolveDoctorId(): void {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !currentUser.userId) return;

    this.uiService.showLoading();
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        const doc = docs.find((d: any) => d.userId === currentUser.userId);
        if (doc) {
          this.doctorId = doc.doctorId;
          this.loadConsultations();
        } else {
          this.uiService.hideLoading();
          this.uiService.showError('Doctor profile not found for this user.');
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctor profile.');
      }
    });
  }

  loadConsultations(): void {
    if (!this.doctorId) return;
    this.consultationService.getConsultationsByDoctor(this.doctorId, 0, 50).subscribe({
      next: (page) => {
        this.consultations = page.content || [];
        this.uiService.hideLoading();
      },
      error: () => this.uiService.hideLoading()
    });
  }

  selectConsultation(c: ConsultationResponseDto): void {
    this.selectedConsultation = c;
    this.statusForm.patchValue({ status: c.status });
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
    }, 3000);
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

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('doctor-messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }
}
