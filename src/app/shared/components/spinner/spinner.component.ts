import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Global Overlay Mode -->
    <div class="spinner-overlay" *ngIf="!inline && uiService.loading()">
      <div [class]="'spinner-ring spinner-' + size"></div>
      <div class="spinner-text" *ngIf="label">{{ label }}</div>
    </div>

    <!-- Inline / Standalone Mode -->
    <div class="spinner-inline" *ngIf="inline">
      <div [class]="'spinner-ring spinner-' + size"></div>
      <span class="spinner-text" *ngIf="label">{{ label }}</span>
    </div>
  `,
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent {
  public uiService = inject(UiService);

  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() inline: boolean = false;
  @Input() label: string = 'Loading...';
}
