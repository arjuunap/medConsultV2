import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../../core/services/appointment.service';
import { UiService } from '../../../core/services/ui.service';
import { AppointmentResponseDto, AppointmentStatus } from '../../../core/models/appointment.model';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.css']
})
export class ScheduleComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private uiService = inject(UiService);

  public upcomingAppointments: AppointmentResponseDto[] = [];
  public statusList = Object.values(AppointmentStatus).filter(
    s => s !== AppointmentStatus.CANCELLED && s !== AppointmentStatus.SCHEDULED
  );

  ngOnInit(): void {
    this.loadDoctorSchedule();
  }

  loadDoctorSchedule(): void {
    this.uiService.showLoading();
    this.appointmentService.getDoctorUpcomingAppointments().subscribe({
      next: (data) => {
        this.upcomingAppointments = data;
        this.uiService.hideLoading();
      },
      error: () => {
        this.uiService.hideLoading();
        this.uiService.showError('Failed to load upcoming schedule.');
      }
    });
  }

  changeStatus(appointmentId: string, status: AppointmentStatus | string): void {
    this.uiService.showLoading();
    this.appointmentService.updateStatus(appointmentId, { status: status as AppointmentStatus }).subscribe({
      next: () => {
        this.uiService.hideLoading();
        this.uiService.showSuccess('Appointment status updated.');
        this.loadDoctorSchedule();
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.uiService.showError(err.error?.message || 'Failed to update status.');
      }
    });
  }
}
