import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { UserRole, Gender } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);

  public roles = [
    { label: 'Patient', value: UserRole.PATIENT },
    { label: 'Doctor', value: UserRole.DOCTOR },
    { label: 'Clinic Administrator', value: UserRole.CLINIC_ADMIN }
  ];

  public genders = [
    { label: 'Male', value: Gender.MALE },
    { label: 'Female', value: Gender.FEMALE },
    { label: 'Prefer not to say', value: Gender.PREFER_NOT_TO_SAY }
  ];

  public registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9 \-]{7,20}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: [UserRole.PATIENT, [Validators.required]],
    gender: [Gender.PREFER_NOT_TO_SAY, [Validators.required]],
    preferredLang: ['en', [Validators.required]]
  });

  public errorMessage = '';

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).pipe(
      switchMap(() => this.authService.fetchCurrentUser())
    ).subscribe({
      next: (user) => {
        this.uiService.hideLoading();
        this.uiService.showSuccess(`Registration successful! Welcome, ${user.fullName}`);
        
        switch (user.role) {
          case UserRole.PATIENT:
            this.router.navigate(['/patient/home']);
            break;
          case UserRole.DOCTOR:
            this.router.navigate(['/doctor/schedule']);
            break;
          case UserRole.CLINIC_ADMIN:
            this.router.navigate(['/clinic-admin/clinics']);
            break;
          default:
            this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.uiService.hideLoading();
        this.errorMessage = err.error?.message || 'Registration failed. Please check the inputs.';
        this.uiService.showError(this.errorMessage);
      }
    });
  }
}
