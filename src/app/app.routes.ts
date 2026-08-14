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
    path: 'oauth-success',
    loadComponent: () => import('./features/auth/oauth-success/oauth-success.component').then(m => m.OauthSuccessComponent)
  },
  // PUBLIC BROWSING ROUTES (No Auth Required for Searching & Viewing Clinics / Doctors)
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'clinics',
        loadComponent: () => import('./features/patient-dashboard/clinic-explorer/clinic-explorer.component').then(m => m.ClinicExplorerComponent)
      },
      {
        path: 'clinics/:id',
        loadComponent: () => import('./features/patient-dashboard/clinic-detail/clinic-detail.component').then(m => m.ClinicDetailComponent)
      },
      {
        path: 'doctors',
        loadComponent: () => import('./features/patient-dashboard/doctors/doctors.component').then(m => m.DoctorsComponent)
      },
      {
        path: 'doctors/:id',
        loadComponent: () => import('./features/doctor-detail/doctor-detail.component').then(m => m.DoctorDetailComponent)
      },
      {
        path: 'patient/clinics',
        loadComponent: () => import('./features/patient-dashboard/clinic-explorer/clinic-explorer.component').then(m => m.ClinicExplorerComponent)
      },
      {
        path: 'patient/clinics/:id',
        loadComponent: () => import('./features/patient-dashboard/clinic-detail/clinic-detail.component').then(m => m.ClinicDetailComponent)
      },
      {
        path: 'patient/doctors',
        loadComponent: () => import('./features/patient-dashboard/doctors/doctors.component').then(m => m.DoctorsComponent)
      },
      {
        path: 'patient/doctors/:id',
        loadComponent: () => import('./features/doctor-detail/doctor-detail.component').then(m => m.DoctorDetailComponent)
      }
    ]
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
        path: 'become-doctor',
        loadComponent: () => import('./features/patient-dashboard/become-doctor/become-doctor.component').then(m => m.BecomeDoctorComponent)
      },
      {
        path: 'become-clinic',
        loadComponent: () => import('./features/patient-dashboard/become-clinic/become-clinic.component').then(m => m.BecomeClinicComponent)
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
        path: 'appointments',
        loadComponent: () => import('./features/patient-dashboard/appointments/appointments.component').then(m => m.AppointmentsComponent)
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
      },
      {
        path: 'appointments-history',
        loadComponent: () => import('./features/doctor-dashboard/appointments-history/appointments-history.component').then(m => m.AppointmentsHistoryComponent)
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
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/clinic-admin/dashboard/clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
      },
      {
        path: 'clinics',
        loadComponent: () => import('./features/clinic-admin/clinics/clinics.component').then(m => m.ClinicsComponent)
      },
      {
        path: 'branches',
        loadComponent: () => import('./features/clinic-admin/clinics/clinics.component').then(m => m.ClinicsComponent)
      },
      {
        path: 'doctors',
        loadComponent: () => import('./features/clinic-admin/doctors/doctors.component').then(m => m.DoctorsComponent)
      },
      {
        path: 'appointments',
        loadComponent: () => import('./features/clinic-admin/dashboard/clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/clinic-admin/dashboard/clinic-dashboard.component').then(m => m.ClinicDashboardComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/clinic-admin/clinics/clinics.component').then(m => m.ClinicsComponent)
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
