import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { timeout } from 'rxjs/operators';
import { BulletinSecretService } from './bulletinSecret.service';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { SettingsService } from './settings.service';

declare var X25519;

@Injectable()
export class PeerService {
    loading = false;
    mode: any;
    failedSeedPeers: any;
    peerLocked: any;
    failedConfigPeers: any;
    constructor(
        private ahttp: Http,
        public walletService: WalletService,
        public transactionService: TransactionService,
        public bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        public storage: Storage
    ) {
        this.mode = true;
        this.failedSeedPeers = new Set();
        this.failedConfigPeers = new Set();
    }

    go() {
        if(this.peerLocked) return new Promise((resolve, reject) => {return resolve(null)})
        return new Promise((resolve, reject) => {
            var domain = window.location.origin;
            this.settingsService.remoteSettingsUrl = domain;
            this.settingsService.remoteSettings = {
                "baseUrl": domain,
                "transactionUrl": domain + "/transaction",
                "fastgraphUrl": domain + "/post-fastgraph-transaction",
                "graphUrl": domain,
                "walletUrl": domain + "/get-graph-wallet",
                "websocketUrl": domain + "/websocket",
                "loginUrl": domain + "/login",
                "registerUrl": domain + "/create-relationship",
                "authenticatedUrl": domain + "/authenticated",
                "logoData": "",
                "identity": {}
            };
            return resolve();
        })
        .then(() => {
            return this.getConfig();
        })
        .then(() => {
            this.peerLocked = true;
            return this.storage.set('node', this.settingsService.remoteSettingsUrl);
        })
    }

    getConfig() {
        return new Promise((resolve, reject) => {
            this.ahttp.get(this.settingsService.remoteSettingsUrl + '/yada-config',).pipe(timeout(1000)).subscribe(
                (res) => {
                    this.loading = false;
                    const remoteSettings = res.json();
                    this.settingsService.remoteSettings = remoteSettings;
                    resolve();
                },
                (err) => {
                    this.failedConfigPeers.add(this.settingsService.remoteSettingsUrl)
                    this.loading = false;
                    return reject('config');
                }
            );
        });
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }

    toHex(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }
}