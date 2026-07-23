import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ApiUrlPipe],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  public authService = inject(AuthService);
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
    if (!user) return [];

    switch (user.role) {
      case UserRole.PATIENT:
        return [
          { label: 'Home Dashboard', route: '/patient/home', icon: '📊' },
          { label: 'Medical Records (EMR)', route: '/patient/emr', icon: '📁' },
          { label: 'Book Appointment', route: '/patient/book-appointment', icon: '📅' },
          { label: 'Tele-Consultations', route: '/patient/consultations', icon: '💬' },
          { label: 'My General Profile', route: '/patient/profile', icon: '👤' },
          { label: 'Personal Health Metrics', route: '/patient/health-profile', icon: '❤️' }
        ];
      case UserRole.DOCTOR:
        return [
          { label: 'Professional Profile', route: '/doctor/profile', icon: '👨‍⚕️' },
          { label: 'Consultation Schedule', route: '/doctor/schedule', icon: '📅' },
          { label: 'My Consultations', route: '/doctor/consultations', icon: '🩺' },
          { label: 'Case Rooms', route: '/doctor/caserooms', icon: '🔬' },
          { label: 'Patient EMR Records', route: '/doctor/patients', icon: '📋' },
          { label: 'Availability & Slots', route: '/doctor/availability', icon: '⏰' }
        ];
      case UserRole.CLINIC_ADMIN:
        return [
          { label: 'Manage Clinics', route: '/clinic-admin/clinics', icon: '🏥' },
          { label: 'Manage Doctors', route: '/clinic-admin/doctors', icon: '👨‍⚕️' }
        ];
      case UserRole.SYSTEM_ADMIN:
        return [
          { label: 'Global Configurations', route: '/system-admin', icon: '⚙️' }
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
