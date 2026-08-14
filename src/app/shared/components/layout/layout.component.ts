import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { AppConfigService } from '../../../core/services/app-config.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UserRole } from '../../../core/models/auth.model';
import { ApiUrlPipe } from '../../pipes/api-url.pipe';
import { environment } from '../../../../environments/environment';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ApiUrlPipe, TranslatePipe],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  public authService = inject(AuthService);
  public languageService = inject(LanguageService);
  public appConfigService = inject(AppConfigService);
  private router = inject(Router);

  public isSidebarOpen = signal<boolean>(false);

  constructor() {
    // Close sidebar on route navigation on mobile
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isSidebarOpen.set(false);
      }
    });
  }

  public toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  public closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  // Computes the menu items dynamically based on the logged-in user's role
  public menuItems = computed<MenuItem[]>(() => {
    const user = this.authService.currentUser();
    if (!user) {
      return [
        { label: 'Clinics & Branches', route: '/clinics', icon: 'clinic' },
        { label: 'Browse Doctors', route: '/doctors', icon: 'doctor' }
      ];
    }

    switch (user.role) {
      case UserRole.PATIENT:
        return [
          { label: 'Home Dashboard', route: '/patient/home', icon: 'dashboard' },
          { label: 'Browse Doctors', route: '/patient/doctors', icon: 'doctor' },
          { label: 'Clinics & Branches', route: '/patient/clinics', icon: 'clinic' },
          { label: 'Book Appointment', route: '/patient/book-appointment', icon: 'book' },
          { label: 'My Appointments', route: '/patient/appointments', icon: 'appointments' },
          { label: 'Tele-Consultations', route: '/patient/consultations', icon: 'consultations' },
          { label: 'Medical Records (EMR)', route: '/patient/emr', icon: 'records' },
          { label: 'Personal Health Metrics', route: '/patient/health-profile', icon: 'health' },
          { label: 'My General Profile', route: '/patient/profile', icon: 'profile' },
          { label: 'Become a Doctor', route: '/patient/become-doctor', icon: 'doctor-join' },
          { label: 'Register a Clinic', route: '/patient/become-clinic', icon: 'clinic-join' }
        ];
      case UserRole.DOCTOR:
        return [
          { label: 'Professional Profile', route: '/doctor/profile', icon: 'doctor' },
          { label: 'Consultation Schedule', route: '/doctor/schedule', icon: 'book' },
          { label: 'Appointments History', route: '/doctor/appointments-history', icon: 'records' },
          { label: 'My Consultations', route: '/doctor/consultations', icon: 'consultations' },
          { label: 'Case Rooms', route: '/doctor/caserooms', icon: 'consultations' },
          { label: 'Patient EMR Records', route: '/doctor/patients', icon: 'records' },
          { label: 'Availability & Slots', route: '/doctor/availability', icon: 'health' }
        ];
      case UserRole.CLINIC_ADMIN:
        return [
          { label: 'Dashboard', route: '/clinic-admin/dashboard', icon: 'dashboard' },
          { label: 'My Clinics', route: '/clinic-admin/clinics', icon: 'clinic' },
          { label: 'Doctors Roster', route: '/clinic-admin/doctors', icon: 'doctor' }
        ];
      case UserRole.SYSTEM_ADMIN:
        return [
          { label: 'Global Configurations', route: '/system-admin', icon: 'settings' }
        ];
      default:
        return [];
    }
  });

  public userInitials = computed<string>(() => {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  });

  apiUrl = environment.apiUrl;

  public handleLogout(): void {
    this.authService.logout();
  }
}
