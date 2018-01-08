import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Deeplinks } from '@ionic-native/deeplinks';
import { Firebase } from '@ionic-native/firebase';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { Storage } from '@ionic/storage';

declare var foobar;
declare var forge;
declare var uuid4;

@Injectable()
export class FirebaseService {
  constructor(
    private settingsService: SettingsService,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private deeplinks: Deeplinks,
    private firebase: Firebase,
    private http: HTTP,
    private storage: Storage
  ) {
    http.setDataSerializer('json');
  }

  initFirebase() {
    this.graphService.getGraph().then(() => {
      for (var i=0; i < this.graphService.graph.friends.length; i++) {
          var friend = this.graphService.graph.friends[i];
          if (this.graphService.graph.rid = friend.rid) {
            try {
              if (friend.relationship.shared_secret) {
                  break;
              }
              friend.relationship = JSON.parse(this.bulletinSecretService.decrypt(friend.relationship));
              break;
            } catch(error) {

            }
          }
      }
      if (!friend) {
        // not registered
        return;
      }
      if (!friend.relationship.shared_secret) {
        return;
      }
      this.firebase.getToken()
      .then((token) => {
          this.http.post(this.settingsService.baseAddress + '/fcm-token', {
            rid: friend.rid,
            token: token,
            shared_secret: friend.relationship.shared_secret
          }, {'Content-Type': 'application/json'})
      })
      .catch((error) => {
          console.error('Error getting token', error)
      });

      this.firebase.onTokenRefresh()
      .subscribe((token: string) => {
          this.http.post(this.settingsService.baseAddress + '/fcm-token', {
            rid: friend.rid,
            token: token,
            shared_secret: friend.relationship.shared_secret
          }, {'Content-Type': 'application/json'})
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