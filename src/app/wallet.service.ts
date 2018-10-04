import { Injectable } from '@angular/core';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Http } from '@angular/http';


@Injectable()
export class WalletService {
    wallet: any;
    walletproviderAddress: any;
    xhr: any;
    key: any;
    walletError = false;
    constructor(
        private ahttp: Http,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
    ) {
        this.wallet = {};
    }

    get() {
        return this.settingsService.refresh()
        .then(() => {
            return this.bulletinSecretService.get();
        }).then(() => {
            return this.walletPromise();
        });
    }

    walletPromise() {
        return new Promise((resolve, reject) => {
            if(this.bulletinSecretService.username) {
                this.ahttp.get(this.settingsService.walletproviderAddress + '?address=' + this.bulletinSecretService.key.getAddress()).
                subscribe((data) => {
                    if(data['_body']) {
                        this.walletError = false;
                        this.wallet = JSON.parse(data['_body']);
                        this.wallet.balancePretty = this.wallet.balance.toFixed(2);
                        resolve(data['_body']);
                    } else {
                        this.walletError = true;
                        this.wallet = {};
                        this.wallet.balancePretty = 0;
                        reject("no data returned");
                    }
                },
                (err) => {
                    this.walletError = true;
                    reject("data or server error");
                });
            } else {
                this.walletError = true;
                reject("username not set");
            }
        });
    }
}