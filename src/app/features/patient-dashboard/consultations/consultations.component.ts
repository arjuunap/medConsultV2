import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ConsultationService } from '../../../core/services/consultation.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { PatientService } from '../../../core/services/patient.service';
import { UiService } from '../../../core/services/ui.service';
import { ConsultationResponseDto, ConsultationMessageResponseDto, MessageType } from '../../../core/models/consultation.model';
import { AuthService } from '../../../core/services/auth.service';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { ReviewService } from '../../../core/services/review.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ApiUrlPipe } from '../../../shared/pipes/api-url.pipe';

@Component({
  selector: 'app-consultations',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CustomSelectComponent, TranslatePipe, ApiUrlPipe],
  templateUrl: './consultations.component.html',
  styleUrls: ['./consultations.component.css']
})
export class ConsultationsComponent implements OnInit, OnDestroy {
  private consultationService = inject(ConsultationService);
  private doctorService = inject(DoctorService);
  private patientService = inject(PatientService);
  private uiService = inject(UiService);
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private reviewService = inject(ReviewService);
  public languageService = inject(LanguageService);

  // Review Modal State
  public showReviewModal = false;
  public reviewForm: FormGroup = this.fb.group({
    doctorRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    ratingBedside: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    ratingKnowledge: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    ratingWait: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    reviewText: ['', [Validators.maxLength(2000)]],
    isAnonymous: [false]
  });

  public doctorRatingOptions = [
    { label: '⭐⭐⭐⭐⭐ (5/5)', value: 5 },
    { label: '⭐⭐⭐⭐ (4/5)', value: 4 },
    { label: '⭐⭐⭐ (3/5)', value: 3 },
    { label: '⭐⭐ (2/5)', value: 2 },
    { label: '⭐ (1/5)', value: 1 }
  ];

  public subRatingOptions = [
    { label: '5 ★', value: 5 },
    { label: '4 ★', value: 4 },
    { label: '3 ★', value: 3 },
    { label: '2 ★', value: 2 },
    { label: '1 ★', value: 1 }
  ];

  public consultations: ConsultationResponseDto[] = [];
  public selectedConsultation: ConsultationResponseDto | null = null;
  public messages: ConsultationMessageResponseDto[] = [];
  public doctors: any[] = [];
  
  public patientId: string = '';

  get doctorSelectOptions() {
    return this.doctors.map(d => ({
      label: `${this.getDoctorDisplayName(d.fullName)} (${d.specialtyName || (this.languageService.isArabic ? 'طبيب أخصائي' : 'Specialist')})`,
      value: d.doctorId
    }));
  }

  getDoctorDisplayName(name: string | null | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    const nameLower = trimmed.toLowerCase();
    if (nameLower.startsWith('dr') || nameLower.startsWith('doctor') || nameLower.startsWith('prof') || nameLower.startsWith('consultant') || nameLower.startsWith('specialist') || nameLower.startsWith('د.')) {
      return trimmed;
    }
    const isAr = this.languageService.isArabic;
    const prefix = isAr ? 'د.' : 'Dr.';
    return `${prefix} ${trimmed}`;
  }

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

  openReviewModal(c: ConsultationResponseDto): void {
    this.selectedConsultation = c;
    
    this.reviewForm.reset({
      doctorRating: 5,
      ratingBedside: 5,
      ratingKnowledge: 5,
      ratingWait: 5,
      reviewText: '',
      isAnonymous: false
    });
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
  }

  submitReview(): void {
    if (this.reviewForm.invalid || !this.selectedConsultation) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    const values = this.reviewForm.value;
    this.uiService.showLoading();

    const appOrConsId = this.selectedConsultation.appointmentId || this.selectedConsultation.consultationId;

    const doctorReviewReq = {
      doctorId: this.selectedConsultation.doctorId,
      appointmentId: appOrConsId,
      rating: values.doctorRating,
      ratingBedside: values.ratingBedside,
      ratingKnowledge: values.ratingKnowledge,
      ratingWait: values.ratingWait,
      reviewText: values.reviewText,
      isAnonymous: values.isAnonymous
    };

    this.reviewService.submitDoctorReview(doctorReviewReq).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Thank you! Your feedback has been submitted successfully.');
        this.closeReviewModal();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to submit feedback. Please try again.');
      }
    });
  }
}
