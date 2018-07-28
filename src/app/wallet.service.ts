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
    constructor(
        private ahttp: Http,
        private bulletinSecretService: BulletinSecretService,
        private settingsService: SettingsService,
    ) {
        this.wallet = {};
    }

    get() {
        return this.settingsService.refresh().then(() => {
            return new Promise((resolve, reject) => {
                this.bulletinSecretService.get().then(() => {
                    return new Promise((resolve1, reject1) => {
                        this.ahttp.get(this.settingsService.walletproviderAddress + '?address=' + this.bulletinSecretService.key.getAddress()).
                        subscribe((data) => {
                            resolve1(data['_body'])
                        });
                    }).then((data: any) => {
                        this.wallet = JSON.parse(data);
                        this.wallet.balancePretty = this.wallet.balance.toFixed(2);
                        resolve();
                    });
                });
            });
        });
    }
}