import { Injectable } from '@angular/core';
import { BulletinSecretService } from './bulletinSecret.service';
import { SettingsService } from './settings.service';
import { Http, RequestOptions, Headers } from '@angular/http';
import { timeout } from 'rxjs/operators';


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

    get(amount_needed=0) {
        return new Promise((resolve, reject) => {
            if (!this.settingsService.remoteSettings['walletUrl']) return resolve();
            this.bulletinSecretService.get()
            .then(() => {
                return this.walletPromise(amount_needed);
            })
            .then(() => {
                return resolve();  
            })
            .catch(() => {
                return reject();  
            });
        })
    }

    walletPromise(amount_needed=0) {
        return new Promise((resolve, reject) => {
            if(!this.settingsService.remoteSettings['walletUrl']) {
                return reject()
            }
            if(this.bulletinSecretService.username) {
                let headers = new Headers();
                headers.append('Authorization', 'Bearer ' + this.settingsService.tokens[this.bulletinSecretService.keyname]);
                let options = new RequestOptions({ headers: headers, withCredentials: true });
                this.ahttp.get(this.settingsService.remoteSettings['walletUrl'] + '?amount_needed=' + amount_needed + '&address=' + this.bulletinSecretService.key.getAddress() + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret + '&origin=' + window.location.origin, options)
                .pipe(timeout(30000))
                .subscribe((data) => {
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