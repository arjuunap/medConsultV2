import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FileMetadataResponseDto {
  fileId: string;
  uploadedById?: string;
  uploadedByName?: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  category?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private http = inject(HttpClient);

  uploadChatFile(file: File, patientId?: string): Observable<FileMetadataResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'CHAT_ATTACHMENT');
    if (patientId) {
      formData.append('patientId', patientId);
    }
    return this.http.post<FileMetadataResponseDto>(`${environment.apiUrl}/api/medconsult/files/`, formData);
  }

  getFileMetadata(fileId: string): Observable<FileMetadataResponseDto> {
    return this.http.get<FileMetadataResponseDto>(`${environment.apiUrl}/api/medconsult/files/${fileId}/metadata`);
  }

  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/api/medconsult/files/${fileId}/download`, {
      responseType: 'blob'
    });
  }
}
