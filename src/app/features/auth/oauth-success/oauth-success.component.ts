import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UiService } from '../../../core/services/ui.service';
import { UserRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-oauth-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-success.component.html',
  styleUrls: ['./oauth-success.component.css']
})
export class OauthSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private uiService = inject(UiService);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    
    if (token) {
      this.uiService.showLoading();
      this.authService.loginWithToken(token).subscribe({
        next: (user) => {
          this.uiService.hideLoading();
          this.uiService.showSuccess(`Welcome back, ${user.fullName}!`);
          
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
          this.uiService.hideLoading();
          this.uiService.showError('Authentication failed. Please try again.');
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.uiService.showError('Token not found in login callback.');
      this.router.navigate(['/login']);
    }
  }
}
