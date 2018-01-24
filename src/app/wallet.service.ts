import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';
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
        private platform: Platform    ) {
        this.wallet = {};
        if(this.platform.is('cordova')) {
          http.setDataSerializer('json');
        }
    }

    get() {
        return this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
            this.walletproviderAddress = walletproviderAddress;
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        if(this.platform.is('cordova')) {
                            this.http.get(
                                this.walletproviderAddress,
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
                            this.ahttp.get(this.walletproviderAddress + '?address=' + this.bulletinSecretService.key.getAddress()).
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