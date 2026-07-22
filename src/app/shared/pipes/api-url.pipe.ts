import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

export function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (
    path.startsWith('http://') || 
    path.startsWith('https://') || 
    path.startsWith('data:') || 
    path.startsWith('blob:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${environment.apiUrl}${cleanPath}`;
}

@Pipe({
  name: 'apiUrl',
  standalone: true
})
export class ApiUrlPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return getFullImageUrl(value);
  }
}
