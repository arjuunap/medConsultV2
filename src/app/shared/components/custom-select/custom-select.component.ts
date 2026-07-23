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

export interface SelectOption {
  label: string;
  value: any;
  icon?: string;
  sublabel?: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  @Output() selectionChange = new EventEmitter<any>();

  isOpen = false;
  selectedValue: any = null;
  selectedOption: any = null;
  searchQuery: string = '';

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef) {}

  writeValue(value: any): void {
    this.selectedValue = value;
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
    this.selectedValue = val;
    this.selectedOption = option;
    this.onChange(val);
    this.selectionChange.emit(val);
    this.isOpen = false;
  }

  get filteredOptions(): any[] {
    if (!this.options) return [];
    if (!this.searchable || !this.searchQuery.trim()) {
      return this.options;
    }
    const query = this.searchQuery.toLowerCase();
    return this.options.filter(opt => {
      const label = this.getOptionLabel(opt).toLowerCase();
      return label.includes(query);
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

  get displayLabel(): string {
    if (this.selectedOption !== null && this.selectedOption !== undefined) {
      return this.getOptionLabel(this.selectedOption);
    }
    if (this.selectedValue !== null && this.selectedValue !== undefined && this.selectedValue !== '') {
      const found = this.options?.find(opt => this.getOptionValue(opt) === this.selectedValue);
      if (found) {
        this.selectedOption = found;
        return this.getOptionLabel(found);
      }
    }
    return this.placeholder;
  }

  isSelected(option: any): boolean {
    const val = this.getOptionValue(option);
    return this.selectedValue === val || (this.selectedValue == val && val !== '');
  }

  private updateSelectedOption(): void {
    if (this.options && this.options.length > 0) {
      this.selectedOption = this.options.find(opt => this.getOptionValue(opt) === this.selectedValue) || null;
    } else {
      this.selectedOption = null;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }
}
