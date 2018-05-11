import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';

@Injectable()
export class SettingsService {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    constructor(private storage: Storage, private http: HTTP) {
        
    }

    refresh() {
        return new Promise((masterResolve, masterReject) => {
            this.storage.get('baseAddress').then((baseAddress) => {
                return new Promise((resolve, reject) => {
                    if(baseAddress == null) {
                        this.baseAddress = 'https://yadacoin.io';
                        this.storage.set('baseAddress', this.baseAddress);
                    } else {
                        this.baseAddress = baseAddress;
                    }
                    resolve();
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get('blockchainAddress').then((blockchainAddress) => {
                        if(blockchainAddress == null) {
                            this.blockchainAddress = 'https://yadacoin.io/transaction';
                            this.storage.set('blockchainAddress', this.blockchainAddress);
                        } else {
                            this.blockchainAddress = blockchainAddress;
                        }
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
                        if(graphproviderAddress == null) {
                            this.graphproviderAddress = 'https://yadacoin.io/get-graph-mobile';
                            this.storage.set('graphproviderAddress', this.graphproviderAddress);
                        } else {
                            this.graphproviderAddress = graphproviderAddress;
                        }
                        resolve();
                    });
                });
            })        
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
                        if(walletproviderAddress == null) {
                            this.walletproviderAddress = 'https://yadacoin.io/wallet';
                            this.storage.set('walletproviderAddress', this.walletproviderAddress);
                        } else {
                            this.walletproviderAddress = walletproviderAddress;
                        }
                        resolve();
                    });
                });
            })
            .then(() => {
                masterResolve();
            });
        });
    }

    save() {
        this.storage.set('baseAddress', this.baseAddress);
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
        this.storage.set('walletproviderAddress', this.walletproviderAddress);
    }
}