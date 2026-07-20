import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models/auth.model';

interface MenuItem {
  label: string;
  route: string;
  icon?: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  public authService = inject(AuthService);
  private router = inject(Router);

  // Computes the menu items dynamically based on the logged-in user's role
  public menuItems = computed<MenuItem[]>(() => {
    const user = this.authService.currentUser();
    if (!user) return [];

    switch (user.role) {
      case UserRole.PATIENT:
        return [
          { label: 'Home Dashboard', route: '/patient/home' },
          { label: 'My Medical Records (EMR)', route: '/patient/emr' },
          { label: 'Book Appointment', route: '/patient/book-appointment' },
          { label: 'Tele-Consultations', route: '/patient/consultations' },
          { label: 'My General Profile', route: '/patient/profile' },
          { label: 'Personal Health Metrics', route: '/patient/health-profile' }
        ];
      case UserRole.DOCTOR:
        return [
          { label: 'Consultation Schedule', route: '/doctor/schedule' },
          { label: 'My Consultations', route: '/doctor/consultations' },
          { label: 'Case Rooms', route: '/doctor/caserooms' },
          { label: 'Patient EMR Records', route: '/doctor/patients' },
          { label: 'Availability & Slots', route: '/doctor/availability' }
        ];
      case UserRole.CLINIC_ADMIN:
        return [
          { label: 'Manage Clinics', route: '/clinic-admin/clinics' },
          { label: 'Manage Doctors', route: '/clinic-admin/doctors' }
        ];
      case UserRole.SYSTEM_ADMIN:
        return [
          { label: 'Global Configurations', route: '/system-admin' }
        ];
      default:
        return [];
    }
  });

  // Computes the initials for the avatar icon
  public userInitials = computed<string>(() => {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  });

  public handleLogout(): void {
    this.authService.logout();
  }
}
