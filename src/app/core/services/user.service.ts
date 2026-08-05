import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/api/medconsult/users/all`);
  }

  getMe(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/users/me`);
  }

  updateProfile(avatarFile: File | null, dto: { fullName?: string; email?: string; phone?: string; gender?: string; preferredLang?: string }): Observable<any> {
    const formData = new FormData();
    if (avatarFile) {
      formData.append('avatar', avatarFile, avatarFile.name);
    }
    const bodyBlob = new Blob([JSON.stringify(dto)], { type: 'application/json' });
    formData.append('body', bodyBlob);

    return this.http.patch<any>(`${environment.apiUrl}/api/medconsult/users/profile/update`, formData).pipe(
      tap(updatedUser => {
        if (updatedUser) {
          this.authService.currentUser.set(updatedUser);
          localStorage.setItem('medconsult_user', JSON.stringify(updatedUser));
        }
      })
    );
  }
}
