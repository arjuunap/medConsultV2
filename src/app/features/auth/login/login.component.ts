import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { UserRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: []
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);

  public loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  public errorMessage = '';

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.uiService.showLoading();
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (user) => {
        console.log(user)
        this.uiService.hideLoading();
        this.uiService.showSuccess(`Welcome back, ${user.fullName}!`);
        
        // Redirect depending on user role
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
          case UserRole.SYSTEM_ADMIN:
            this.router.navigate(['/system-admin']);
            break;
          default:
            this.router.navigate(['/']);
        }
      },
      error: (err) => {
        console.error(err)
        this.uiService.hideLoading();
        this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
        this.uiService.showError(this.errorMessage);
      }
    });
  }
}
