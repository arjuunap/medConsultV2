import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppointmentService } from '../../../core/services/appointment.service';
import { DoctorService } from '../../../core/services/doctor.service';
import { ClinicService } from '../../../core/services/clinic.service';
import { UiService } from '../../../core/services/ui.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { AppointmentStatus, SessionType } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-appointments-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CustomSelectComponent, TranslatePipe],
  templateUrl: './appointments-history.component.html',
  styleUrls: ['./appointments-history.component.css']
})
export class AppointmentsHistoryComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private clinicService = inject(ClinicService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public languageService = inject(LanguageService);

  public doctorId = '';
  public appointments: any[] = [];
  
  // Filters
  public selectedStatus = '';
  public selectedSessionType = '';
  public fromDate = '';
  public toDate = '';

  // Pagination
  public page = 0;
  public size = 10;
  public totalPages = 1;
  public totalElements = 0;

  // Selected details modal
  public selectedAppointment: any | null = null;
  public showDetailsModal = false;

  private placementsCache: { [dcId: string]: any } = {};

  get statusOptions() {
    return [
      { label: this.languageService.translate('All Statuses', 'جميع الحالات'), value: '' },
      { label: this.languageService.translate('Scheduled', 'مجدول'), value: 'SCHEDULED' },
      { label: this.languageService.translate('Confirmed', 'مؤكد'), value: 'CONFIRMED' },
      { label: this.languageService.translate('Completed', 'مكتمل'), value: 'COMPLETED' },
      { label: this.languageService.translate('Cancelled', 'ملغي'), value: 'CANCELLED' },
      { label: this.languageService.translate('No Show', 'عدم حضور'), value: 'NO_SHOW' }
    ];
  }

  get sessionTypeOptions() {
    return [
      { label: this.languageService.translate('All Modes', 'جميع الطرق'), value: '' },
      { label: this.languageService.translate('In-Clinic Visit', 'زيارة العيادة'), value: 'IN_CLINIC' },
      { label: this.languageService.translate('Video Call', 'مكالمة فيديو'), value: 'VIDEO_CALL' }
    ];
  }

  ngOnInit(): void {
    this.loadDoctorProfile();
  }

  loadDoctorProfile(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.uiService.showLoading();
    this.doctorService.getAllDoctors().subscribe({
      next: (docs) => {
        const doc = docs.find((d: any) =>
          (d.email && d.email.toLowerCase() === user.email?.toLowerCase()) ||
          (d.fullName && d.fullName.trim().toLowerCase() === user.fullName?.trim().toLowerCase())
        );
        if (doc) {
          this.doctorId = doc.doctorId;
          this.loadClinicsInfo(this.doctorId);
        } else {
          this.uiService.hideLoading();
          this.uiService.showError('Doctor profile not found for this account.');
        }
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load doctor profiles.');
      }
    });
  }

  loadClinicsInfo(doctorId: string): void {
    this.doctorService.getDoctorClinics(doctorId).subscribe({
      next: (data) => {
        const activeClinics = data.filter((c: any) => c.isActive);
        if (activeClinics.length === 0) {
          this.loadAppointments();
          return;
        }

        const nameRequests = activeClinics.map(dc => {
          return forkJoin({
            clinic: this.clinicService.getClinicById(dc.clinicId).pipe(catchError(() => of({ nameEn: 'Clinic', nameAr: 'عيادة' }))),
            branches: this.clinicService.getClinicBranches(dc.clinicId).pipe(catchError(() => of([])))
          }).pipe(
            map(res => {
              dc.clinicNameEn = res.clinic.nameEn;
              dc.clinicNameAr = res.clinic.nameAr;
              const branch = res.branches.find(b => b.branchId === dc.branchId);
              dc.branchNameEn = branch ? branch.branchNameEn : 'Main Branch';
              dc.branchNameAr = branch ? branch.branchNameAr : 'الفرع الرئيسي';
              return dc;
            }),
            catchError(() => of(dc))
          );
        });

        forkJoin(nameRequests).subscribe({
          next: (updatedClinics) => {
            updatedClinics.forEach(dc => {
              this.placementsCache[dc.dcId] = dc;
            });
            this.loadAppointments();
          },
          error: () => {
            activeClinics.forEach(dc => {
              this.placementsCache[dc.dcId] = dc;
            });
            this.loadAppointments();
          }
        });
      },
      error: () => {
        this.loadAppointments();
      }
    });
  }

  loadAppointments(): void {
    this.uiService.showLoading();
    
    const searchRequest: any = {
      doctorId: this.doctorId,
      page: this.page,
      size: this.size,
      sortBy: 'scheduledDate',
      sortDir: 'DESC'
    };

    if (this.selectedStatus) {
      searchRequest.status = this.selectedStatus;
    }

    if (this.selectedSessionType) {
      searchRequest.sessionType = this.selectedSessionType;
    }

    if (this.fromDate) {
      searchRequest.fromDate = this.fromDate;
    }

    if (this.toDate) {
      searchRequest.toDate = this.toDate;
    }

    this.appointmentService.searchAppointments(searchRequest).subscribe({
      next: (res) => {
        this.appointments = (res.content || []).map((app: any) => {
          const placement = this.placementsCache[app.dcId];
          return {
            ...app,
            clinicNameEn: placement?.clinicNameEn || 'Private Clinic',
            clinicNameAr: placement?.clinicNameAr || 'عيادة خاصة',
            branchNameEn: placement?.branchNameEn || 'Main Branch',
            branchNameAr: placement?.branchNameAr || 'الفرع الرئيسي',
            department: placement?.department || 'General Practice'
          };
        });
        this.totalPages = res.totalPages || 1;
        this.totalElements = res.totalElements || 0;
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load appointments history.');
      }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadAppointments();
  }

  clearFilters(): void {
    this.selectedStatus = '';
    this.selectedSessionType = '';
    this.fromDate = '';
    this.toDate = '';
    this.page = 0;
    this.loadAppointments();
  }

  openDetails(app: any): void {
    this.selectedAppointment = app;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.showDetailsModal = false;
    this.selectedAppointment = null;
  }

  getPatientInitials(name: string): string {
    if (!name) return 'PT';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getAvatarBg(name: string): string {
    const bgColors = ['#E1F5EE', '#DBEAFE', '#EDE9FE', '#FEF3C7', '#DCFCE7'];
    const idx = name ? name.charCodeAt(0) : 0;
    return bgColors[idx % bgColors.length];
  }

  getAvatarColor(name: string): string {
    const textColors = ['#085041', '#1E40AF', '#5B21B6', '#92400E', '#166534'];
    const idx = name ? name.charCodeAt(0) : 0;
    return textColors[idx % textColors.length];
  }

  goToChat(consultationId: string): void {
    this.closeDetails();
    this.router.navigate(['/doctor/consultations'], { queryParams: { id: consultationId } });
  }

  goToEMR(patientId: string): void {
    this.closeDetails();
    this.router.navigate(['/doctor/patients'], { queryParams: { id: patientId } });
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadAppointments();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadAppointments();
    }
  }
}
