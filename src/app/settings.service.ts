import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable()
export class SettingsService {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    siaAddress = null
    siaPassword = null
    constructor(private storage: Storage) {
        
    }

    refresh() {
        return new Promise((masterResolve, masterReject) => {
            this.storage.get('baseAddress').then((baseAddress) => {
                return new Promise((resolve, reject) => {
                    if(baseAddress == null) {
                        this.baseAddress = 'https://yadacoin.io:8000';
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
                            this.blockchainAddress = 'https://yadacoin.io:8000/transaction';
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
                            this.graphproviderAddress = 'https://yadacoin.io:8000/get-graph-mobile';
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
                            this.walletproviderAddress = 'https://yadacoin.io:8000/wallet';
                            this.storage.set('walletproviderAddress', this.walletproviderAddress);
                        } else {
                            this.walletproviderAddress = walletproviderAddress;
                        }
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get('siaAddress').then((siaAddress) => {
                        if(siaAddress == null) {
                            this.siaAddress = 'http://localhost:9980';
                            this.storage.set('siaAddress', this.siaAddress);
                        } else {
                            this.siaAddress = siaAddress;
                        }
                        resolve();
                    });
                });
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get('siaPassword').then((siaPassword) => {
                        if(siaPassword == null) {
                            this.siaPassword = 'http://localhost:9980';
                            this.storage.set('siaPassword', this.siaPassword);
                        } else {
                            this.siaPassword = siaPassword;
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
        this.storage.set('siaAddress', this.siaAddress);
        this.storage.set('siaPassword', this.siaPassword);
    }
}