import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { UserRole, Gender } from '../../../core/models/auth.model';
import { CustomSelectComponent } from '../../../shared/components/custom-select/custom-select.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CustomSelectComponent, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private uiService = inject(UiService);
  private router = inject(Router);
  public languageService = inject(LanguageService);

  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/oauth2/authorization/google`;
  }

  get roles() {
    return [
      { label: this.languageService.translate('Patient', 'مريض'), value: UserRole.PATIENT },
      { label: this.languageService.translate('Doctor', 'طبيب'), value: UserRole.DOCTOR },
      { label: this.languageService.translate('Clinic Administrator', 'مدير عيادة'), value: UserRole.CLINIC_ADMIN }
    ];
  }

  get genders() {
    return [
      { label: this.languageService.translate('Male', 'ذكر'), value: Gender.MALE },
      { label: this.languageService.translate('Female', 'أنثى'), value: Gender.FEMALE },
      { label: this.languageService.translate('Prefer not to say', 'أفضل عدم الإفصاح'), value: Gender.PREFER_NOT_TO_SAY }
    ];
  }

  get languages() {
    return [
      { label: this.languageService.translate('English (EN)', 'الإنجليزية (EN)'), value: 'en' },
      { label: this.languageService.translate('Arabic (AR)', 'العربية (AR)'), value: 'ar' }
    ];
  }

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
