import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({
  providedIn: 'root'
})
export class UiService {
  // Global loading overlay indicator
  public loading = signal<boolean>(false);

  // Global active toast notifications list
  public toasts = signal<ToastMessage[]>([]);
  private toastIdCounter = 0;

  showLoading(): void {
    this.loading.set(true);
  }

  hideLoading(): void {
    this.loading.set(false);
  }

  showSuccess(message: string, duration = 3000): void {
    this.addToast(message, 'success', duration);
  }

  showError(message: string, duration = 4000): void {
    this.addToast(message, 'error', duration);
  }

  showWarning(message: string, duration = 3500): void {
    this.addToast(message, 'warning', duration);
  }

  showInfo(message: string, duration = 3000): void {
    this.addToast(message, 'info', duration);
  }

  removeToast(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private addToast(message: string, type: 'success' | 'error' | 'info' | 'warning', duration: number): void {
    const id = ++this.toastIdCounter;
    this.toasts.update(list => [...list, { id, message, type }]);

    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }
}
