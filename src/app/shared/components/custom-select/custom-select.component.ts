import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ElementRef,
  HostListener,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

import { TranslatePipe } from '../../pipes/translate.pipe';

export interface SelectOption {
  label: string;
  value: any;
  icon?: string;
  sublabel?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() options: any[] = [];
  @Input() placeholder: string = 'Select option';
  @Input() icon: string = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() disabled: boolean = false;
  @Input() searchable: boolean = false;
  @Input() bindLabel: string = 'label';
  @Input() bindValue: string = 'value';
  @Input() customClass: string = '';
  @Input() placement: 'top' | 'bottom' = 'bottom';
  @Input() multiple: boolean = false;

  @Output() selectionChange = new EventEmitter<any>();

  isOpen = false;
  selectedValue: any = null;
  selectedOption: any = null;
  searchQuery: string = '';

  private onChange: (value: any) => void = () => { };
  private onTouched: () => void = () => { };

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef) { }

  writeValue(value: any): void {
    if (this.multiple) {
      this.selectedValue = Array.isArray(value) ? value : (value ? [value] : []);
    } else {
      this.selectedValue = value;
    }
    this.updateSelectedOption();
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) {
      this.isOpen = false;
    }
    this.cdr.markForCheck();
  }

  toggleOpen(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchQuery = '';
      this.onTouched();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  selectOption(option: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const val = this.getOptionValue(option);
    if (this.multiple) {
      if (!Array.isArray(this.selectedValue)) {
        this.selectedValue = [];
      }
      const idx = this.selectedValue.indexOf(val);
      if (idx > -1) {
        this.selectedValue = this.selectedValue.filter((v: any) => v !== val);
      } else {
        this.selectedValue = [...this.selectedValue, val];
      }
      this.updateSelectedOption();
      this.onChange(this.selectedValue);
      this.selectionChange.emit(this.selectedValue);
    } else {
      this.selectedValue = val;
      this.selectedOption = option;
      this.onChange(val);
      this.selectionChange.emit(val);
      this.isOpen = false;
    }
  }

  get filteredOptions(): any[] {
    if (!this.options) return [];
    if (!this.searchable || !this.searchQuery.trim()) {
      return this.options;
    }
    const query = this.searchQuery.toLowerCase().trim();
    return this.options.filter(opt => {
      const label = this.getOptionLabel(opt).toLowerCase();
      const nameEn = (opt?.nameEn || opt?.rawOption?.nameEn || '').toLowerCase();
      const nameAr = (opt?.nameAr || opt?.rawOption?.nameAr || '').toLowerCase();
      const code = (opt?.code || opt?.value || opt?.rawOption?.code || '').toString().toLowerCase();
      return label.includes(query) || nameEn.includes(query) || nameAr.includes(query) || code.includes(query);
    });
  }

  getOptionLabel(option: any): string {
    if (option === null || option === undefined) return '';
    if (typeof option === 'string' || typeof option === 'number') {
      return String(option);
    }
    return option[this.bindLabel] || option.label || option.name || String(option);
  }

  getOptionValue(option: any): any {
    if (option === null || option === undefined) return null;
    if (typeof option === 'string' || typeof option === 'number' || typeof option === 'boolean') {
      return option;
    }
    if (this.bindValue && option[this.bindValue] !== undefined) {
      return option[this.bindValue];
    }
    if (option.value !== undefined) {
      return option.value;
    }
    if (option.id !== undefined) {
      return option.id;
    }
    return option;
  }

  getOptionIcon(option: any): string {
    if (!option || typeof option !== 'object') return '';
    return option.icon || '';
  }

  getOptionFlagUrl(option: any): string {
    if (!option) return '';
    if (typeof option === 'object') {
      if (option.flagUrl) return option.flagUrl;
      if (option.code && typeof option.code === 'string' && option.code.length === 2 && option.code !== 'OT') {
        return `https://flagcdn.com/w40/${option.code.toLowerCase()}.png`;
      }
    }
    return '';
  }

  get displayLabel(): string {
    if (this.multiple) {
      if (!Array.isArray(this.selectedValue) || this.selectedValue.length === 0) {
        return this.placeholder;
      }
      const labels = this.selectedValue.map(val => {
        const found = this.options?.find(opt => this.getOptionValue(opt) === val);
        return found ? this.getOptionLabel(found) : '';
      }).filter(Boolean);
      return labels.length > 0 ? labels.join(', ') : this.placeholder;
    }

    const found = this.options?.find(opt => this.getOptionValue(opt) === this.selectedValue);
    if (found) {
      this.selectedOption = found;
      return this.getOptionLabel(found);
    }
    if (this.selectedOption !== null && this.selectedOption !== undefined) {
      return this.getOptionLabel(this.selectedOption);
    }
    return this.placeholder;
  }

  isSelected(option: any): boolean {
    const val = this.getOptionValue(option);
    if (this.multiple) {
      return Array.isArray(this.selectedValue) && this.selectedValue.includes(val);
    }
    return this.selectedValue === val || (this.selectedValue == val && val !== '');
  }

  private updateSelectedOption(): void {
    if (this.multiple) {
      if (Array.isArray(this.selectedValue) && this.options) {
        this.selectedOption = this.options.find(opt => this.selectedValue.includes(this.getOptionValue(opt))) || null;
      } else {
        this.selectedOption = null;
      }
    } else {
      if (this.options && this.options.length > 0) {
        this.selectedOption = this.options.find(opt => this.getOptionValue(opt) === this.selectedValue) || null;
      } else {
        this.selectedOption = null;
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    if (this.isOpen) {
      const target = event.target as HTMLElement;
      if (target && this.elementRef.nativeElement.contains(target)) {
        return;
      }
      this.close();
      this.cdr.markForCheck();
    }
  }
}
