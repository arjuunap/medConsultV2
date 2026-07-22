import { Routes } from '@angular/router';
import { authGuard, roleGuard, noAuthGuard } from './core/guards/auth.guard';
import { UserRole } from './core/models/auth.model';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'patient',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard([UserRole.PATIENT])],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('./features/patient-dashboard/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/patient-dashboard/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'health-profile',
        loadComponent: () => import('./features/patient-dashboard/health-profile/health-profile.component').then(m => m.HealthProfileComponent)
      },
      {
        path: 'book-appointment',
        loadComponent: () => import('./features/patient-dashboard/book-appointment/book-appointment.component').then(m => m.BookAppointmentComponent)
      },
      {
        path: 'emr',
        loadComponent: () => import('./features/patient-dashboard/emr/emr.component').then(m => m.EmrComponent)
      },
      {
        path: 'consultations',
        loadComponent: () => import('./features/patient-dashboard/consultations/consultations.component').then(m => m.ConsultationsComponent)
      }
    ]
  },
  {
    path: 'doctor',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard([UserRole.DOCTOR])],
    children: [
      {
        path: '',
        redirectTo: 'schedule',
        pathMatch: 'full'
      },
      {
        path: 'schedule',
        loadComponent: () => import('./features/doctor-dashboard/schedule/schedule.component').then(m => m.ScheduleComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/doctor-dashboard/profile/doctor-profile.component').then(m => m.DoctorProfileComponent)
      },
      {
        path: 'patients',
        loadComponent: () => import('./features/doctor-dashboard/patients/patients.component').then(m => m.PatientsComponent)
      },
      {
        path: 'availability',
        loadComponent: () => import('./features/doctor-dashboard/availability/availability.component').then(m => m.AvailabilityComponent)
      },
      {
        path: 'consultations',
        loadComponent: () => import('./features/doctor-dashboard/consultations/doctor-consultations/doctor-consultations.component').then(m => m.DoctorConsultationsComponent)
      },
      {
        path: 'caserooms',
        loadComponent: () => import('./features/doctor-dashboard/caserooms/case-rooms/case-rooms.component').then(m => m.CaseRoomsComponent)
      }
    ]
  },
  {
    path: 'clinic-admin',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard([UserRole.CLINIC_ADMIN])],
    children: [
      {
        path: '',
        redirectTo: 'clinics',
        pathMatch: 'full'
      },
      {
        path: 'clinics',
        loadComponent: () => import('./features/clinic-admin/clinics/clinics.component').then(m => m.ClinicsComponent)
      },
      {
        path: 'doctors',
        loadComponent: () => import('./features/clinic-admin/doctors/doctors.component').then(m => m.DoctorsComponent)
      }
    ]
  },
  {
    path: 'system-admin',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard([UserRole.SYSTEM_ADMIN])],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/system-admin/system-admin.component').then(m => m.SystemAdminComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
