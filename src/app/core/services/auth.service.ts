import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private tokenKey = 'medconsult_token';
  private currentUserKey = 'medconsult_user';

  // Signals for lightweight reactive state
  public currentUser = signal<any>(null);
  public token = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      let storedToken = localStorage.getItem(this.tokenKey);
      const storedUser = localStorage.getItem(this.currentUserKey);

      // Cookie fallback
      if (!storedToken) {
        storedToken = this.getCookie(this.tokenKey);
      }

      if (storedToken && storedUser) {
        this.token.set(storedToken);
        try {
          this.currentUser.set(JSON.parse(storedUser));
        } catch (e) {
          this.logout();
        }
      } else if (storedToken) {
        this.token.set(storedToken);
        this.fetchCurrentUser().subscribe({
          error: () => this.logout()
        });
      }
    }
  }

  public isLoggedIn(): boolean {
    return !!this.token();
  }

  public hasRole(roles: any[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'SYSTEM_ADMIN') return true;
    return roles.includes(user.role);
  }

  public login(credentials: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/auth/login`, credentials).pipe(
      tap(res => {
        this.saveSession(res.token);
      }),
      switchMap(() => this.fetchCurrentUser())
    );
  }

  public register(payload: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/api/medconsult/auth/register`, payload).pipe(
      tap(res => {
        this.saveSession(res.token);
      })
    );
  }

  public fetchCurrentUser(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/api/medconsult/users/me`).pipe(
      tap(user => {
        this.currentUser.set(user);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.currentUserKey, JSON.stringify(user));
        }
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  public logout(redirectUrl: string = '/'): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.currentUserKey);
      document.cookie = `${this.tokenKey}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
    this.router.navigate([redirectUrl]);
  }

  private saveSession(jwt: string): void {
    this.token.set(jwt);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.tokenKey, jwt);
      document.cookie = `${this.tokenKey}=${jwt}; path=/; max-age=604800; SameSite=Lax`;
    }
  }

  private getCookie(name: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
}
