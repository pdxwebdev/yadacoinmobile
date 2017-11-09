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
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.wallet = {};
        this.refresh();
    }

    refresh() {
        this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
            this.walletproviderAddress = walletproviderAddress;

            this.storage.get('key').then((key) => {
                if(key && typeof key == 'string') {
                    this.key = foobar.bitcoin.ECPair.fromWIF(key);
                } else {
                    this.key = foobar.bitcoin.ECPair.makeRandom();
                    this.storage.set('key', this.key.toWIF());
                }
                this.xhr = new XMLHttpRequest();
                this.xhr.open('GET', this.walletproviderAddress + '?address='+this.key.getAddress(), true);
                this.xhr.onreadystatechange = () => {
                    if (this.xhr.readyState === 4) {
                        this.wallet = JSON.parse(this.xhr.responseText);
                    }
                }
                this.xhr.send();
            });
        });
    }
}