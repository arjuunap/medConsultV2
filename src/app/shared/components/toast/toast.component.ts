import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" *ngIf="uiService.toasts().length > 0">
      <div 
        *ngFor="let toast of uiService.toasts()" 
        [class]="'toast-item toast-' + toast.type"
      >
        <div class="toast-icon">
          <span *ngIf="toast.type === 'success'">✓</span>
          <span *ngIf="toast.type === 'error'">✕</span>
          <span *ngIf="toast.type === 'warning'">⚠</span>
          <span *ngIf="toast.type === 'info'">ℹ</span>
        </div>
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
        </div>
        <button class="toast-close" (click)="uiService.removeToast(toast.id)" aria-label="Close notification">&times;</button>
        <div 
          class="toast-progress" 
          [style.animationDuration.ms]="toast.duration || 3000"
        ></div>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  public uiService = inject(UiService);
}
