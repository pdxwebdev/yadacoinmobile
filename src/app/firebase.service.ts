import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Firebase } from '@ionic-native/firebase';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';

declare var foobar;
declare var forge;
declare var uuid4;
declare var firebase;

@Injectable()
export class FirebaseService {
  constructor(
    private settingsService: SettingsService,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private deeplinks: Deeplinks,
    public firebase: Firebase,
    private http: HTTP,
    private storage: Storage,
    private platform: Platform,
    private ahttp: Http
  ) {
    if(this.platform.is('android') || this.platform.is('ios')) {
      http.setDataSerializer('json');
    }
  }

  initFirebase() {
    this.graphService.getGraph().then(() => {
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
        this.graphService.getGraph().then(() => {
          // used for an example of ngFor and navigation
          this.storage.set('friend_request-' + notification.requester_rid+notification.requested_rid, JSON.stringify(notification));
        });
      });
    });
  }
}