import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { GraphService } from './graph.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { WalletService } from './wallet.service';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { Push, PushObject, PushOptions } from '@ionic-native/push';

declare var foobar;
declare var forge;
declare var uuid4;

@Injectable()
export class PushService {
  constructor(
    private settingsService: SettingsService,
    private walletService: WalletService,
    private graphService: GraphService,
    private bulletinSecretService: BulletinSecretService,
    private push: Push,
    private http: HTTP,
    private storage: Storage,
    private platform: Platform,
    private ahttp: Http
  ) {}

  initPush() {
    this.graphService.getGraph().then(() => {
      const options: PushOptions = {
         android: {
           senderID: '805178314562',
         },
         ios: {},
         windows: {},
         browser: {
             pushServiceURL: 'http://push.api.phonegap.com/v1/push',
             applicationServerKey: 'BLuv1UWDqzAyTtK5xlNaY4tFOz6vKbjuutTQ0KmBRG5btvVbydsrMTA-UeyMqY4oCC1Gu3sDwLfsg-iWtAg6IB0'
         }
      };
      const pushObject: PushObject = this.push.init(options);
      var hey = this.push.hasPermission();
      pushObject.on('registration').subscribe((registration: any) => {
        console.log('Device registered', registration);
        this.ahttp.post(this.settingsService.baseAddress + '/fcm-token', {
          rid: this.graphService.graph.rid,
          token: registration.registrationId
        }).subscribe(() => {});
      }, (error) => {
        console.log(error);
      });


      pushObject.on('error').subscribe(error => {
        console.error('Error with Push plugin', error);
        console.error('Error getting token', error);
      });

      pushObject.on('notification').subscribe(notification => {
        console.log('Received a notification', notification);
        // used for an example of ngFor and navigation
      });
    });
  }
}