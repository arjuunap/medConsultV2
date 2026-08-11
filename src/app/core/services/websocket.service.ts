if (typeof window !== 'undefined' && !(window as any).global) {
  (window as any).global = window;
}

import { Injectable } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
// @ts-ignore
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ConsultationMessageResponseDto, ConsultationMessageRequestDto } from '../models/consultation.model';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private rxStomp: RxStomp;
  private isConnected = false;

  constructor(private authService: AuthService) {
    this.rxStomp = new RxStomp();
  }

  public connect(): void {
    if (this.isConnected) return;

    try {
      const token = this.authService.token();
      if (!token) return;

      this.rxStomp.configure({
        webSocketFactory: () => {
          try {
            return new SockJS(`${environment.apiUrl}/ws`);
          } catch (e) {
            console.warn('SockJS instantiation failed:', e);
            return null as any;
          }
        },
        connectHeaders: {
          Authorization: `Bearer ${token}`
        },
        heartbeatIncoming: 0,
        heartbeatOutgoing: 20000,
        reconnectDelay: 2000,
        debug: (msg: string): void => {
          // console.log(new Date(), msg);
        }
      });

      this.rxStomp.activate();
      this.isConnected = true;
    } catch (e) {
      console.warn('WebSocket connect failed:', e);
    }
  }

  public disconnect(): void {
    if (this.isConnected) {
      try {
        this.rxStomp.deactivate();
      } catch (e) {}
      this.isConnected = false;
    }
  }

  public watchConsultation(consultationId: string): Observable<ConsultationMessageResponseDto> {
    try {
      this.connect();
      return this.rxStomp.watch(`/topic/consultation/${consultationId}`).pipe(
        map(message => {
          try {
            return JSON.parse(message.body) as ConsultationMessageResponseDto;
          } catch (e) {
            return null as any;
          }
        }),
        catchError(() => of(null as any))
      );
    } catch (e) {
      return of(null as any);
    }
  }

  public watchCaseRoom(caseRoomId: string): Observable<any> {
    try {
      this.connect();
      return this.rxStomp.watch(`/topic/caseroom/${caseRoomId}`).pipe(
        map(message => {
          try {
            return JSON.parse(message.body);
          } catch (e) {
            return null as any;
          }
        }),
        catchError(() => of(null as any))
      );
    } catch (e) {
      return of(null as any);
    }
  }

  public sendChatMessage(dto: ConsultationMessageRequestDto): void {
    try {
      this.connect();
      this.rxStomp.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(dto)
      });
    } catch (e) {
      console.warn('sendChatMessage failed:', e);
    }
  }

  public watch(destination: string): Observable<any> {
    try {
      this.connect();
      return this.rxStomp.watch(destination).pipe(
        catchError(() => of(null))
      );
    } catch (e) {
      return of(null);
    }
  }

  public publish(destination: string, body: any): void {
    try {
      this.connect();
      this.rxStomp.publish({
        destination,
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.warn('publish failed:', e);
    }
  }
}
