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
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" (click)="uiService.removeToast(toast.id)">&times;</button>
      </div>
    </div>
  `,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  public uiService = inject(UiService);
}
