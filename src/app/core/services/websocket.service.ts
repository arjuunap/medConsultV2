import { Injectable } from '@angular/core';
import { RxStomp } from '@stomp/rx-stomp';
// @ts-ignore
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

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

    const token = this.authService.token();
    if (!token) return;

    this.rxStomp.configure({
      webSocketFactory: () => {
        return new SockJS(`${environment.apiUrl}/ws`);
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      heartbeatIncoming: 0,
      heartbeatOutgoing: 20000,
      reconnectDelay: 200,
      debug: (msg: string): void => {
        // console.log(new Date(), msg);
      }
    });

    this.rxStomp.activate();
    this.isConnected = true;
  }

  public disconnect(): void {
    if (this.isConnected) {
      this.rxStomp.deactivate();
      this.isConnected = false;
    }
  }

  public watch(destination: string): Observable<any> {
    this.connect(); // ensure connected
    return this.rxStomp.watch(destination);
  }

  public publish(destination: string, body: any): void {
    this.rxStomp.publish({
      destination,
      body: JSON.stringify(body)
    });
  }
}
