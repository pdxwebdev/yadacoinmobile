import { Injectable } from '@angular/core';
import { Firebase } from '@ionic-native/firebase';
import { GraphService } from './graph.service';
import { SettingsService } from './settings.service';
import { Http } from '@angular/http';


@Injectable()
export class FirebaseService {
  constructor(
    private settingsService: SettingsService,
    private graphService: GraphService,
    public firebase: Firebase,
    private ahttp: Http
  ) {}

  initFirebase() {
    if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
      this.firebase.getToken()
      .then((token) => {
        console.log(token);
        this.ahttp.post(this.settingsService.baseAddress + '/fcm-token', {
          rid: this.graphService.graph.rid,
          token: token,
        }).subscribe(() => {});
      })
      .catch((error) => {
          console.log('Error getting token', error)
      });

      this.firebase.onTokenRefresh()
      .subscribe((token: string) => {
        console.log(token);
        this.ahttp.post(this.settingsService.baseAddress + '/fcm-token', {
          rid: this.graphService.graph.rid,
          token: token
        }).subscribe(() => {});
      });

      this.firebase.onNotificationOpen().subscribe(notification => {
        console.log(notification);
      });
    }
  }
}