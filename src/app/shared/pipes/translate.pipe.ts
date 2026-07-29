import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private langService = inject(LanguageService);

  transform(key: string): string {
    return this.langService.instant(key);
  }
}

@Pipe({
  name: 'translateObj',
  standalone: true,
  pure: false
})
export class TranslateObjPipe implements PipeTransform {
  private langService = inject(LanguageService);

  transform(obj: any, fieldBase: string): string {
    if (!obj) return '';
    const isAr = this.langService.isArabic;
    const suffix = isAr ? 'Ar' : 'En';
    const val = obj[fieldBase + suffix];
    if (val !== undefined && val !== null) {
      return val;
    }
    const fallbackSuffix = isAr ? 'En' : 'Ar';
    const fallbackVal = obj[fieldBase + fallbackSuffix];
    if (fallbackVal !== undefined && fallbackVal !== null) {
      return fallbackVal;
    }
    return obj[fieldBase] || '';
  }
}
