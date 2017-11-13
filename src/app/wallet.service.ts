import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

declare var forge;
declare var foobar;

@Injectable()
export class WalletService {
    wallet: any;
    walletproviderAddress: any;
    xhr: any;
    key: any;
    constructor(private storage: Storage, private http: HTTP, private bulletinSecretService: BulletinSecretService) {
        this.wallet = {};
        http.setDataSerializer('json');
    }

    get() {
        return this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
            this.walletproviderAddress = walletproviderAddress;
            return new Promise((resolve1, reject1) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve, reject) => {
                        this.http.get(
                            this.walletproviderAddress,
                            {
                                address: this.bulletinSecretService.key.getAddress()
                            },
                            {
                                'Content-Type': 'application/json'
                            }
                        ).then((data) => {
                            resolve(data);
                        });
                    }).then((data) => {
                        this.wallet = JSON.parse(data['data']);
                        resolve1();
                    });
                });
            });
        });
    }
}