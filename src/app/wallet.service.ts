import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';

declare var forge;
declare var foobar;

@Injectable()
export class WalletService {
    wallet: any;
    walletproviderAddress: any;
    xhr: any;
    key: any;
    constructor(
        private storage: Storage,
        private http: HTTP,
        private ahttp: Http,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
        private platform: Platform    ) {
        this.wallet = {};
        if(this.platform.is('android') || this.platform.is('ios')) {
          http.setDataSerializer('json');
        }
    }

    get() {
        return this.settingsService.refresh().then(() => {
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        if(this.platform.is('android') || this.platform.is('ios')) {
                            this.http.get(
                                this.settingsService.walletproviderAddress,
                                {
                                    address: this.bulletinSecretService.key.getAddress()
                                },
                                {
                                    'Content-Type': 'application/json'
                                }
                            ).then((data) => {
                                resolve1(data['data']);
                            });
                        } else {
                            this.ahttp.get(this.settingsService.walletproviderAddress + '?address=' + this.bulletinSecretService.key.getAddress()).
                            subscribe((data) => {
                                resolve1(data['_body'])
                            });
                        }
                    }).then((data: any) => {
                        this.wallet = JSON.parse(data);
                        resolve();
                    });
                });
            });
        });
    }
}