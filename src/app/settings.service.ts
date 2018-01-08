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
        this.storage.get('baseAddress').then((baseAddress) => {
            if(baseAddress == null) {
                this.baseAddress = 'http://71.237.161.227:5000';
                this.storage.set('baseAddress', this.baseAddress);
            } else {
                this.baseAddress = baseAddress;
            }
        });
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            if(blockchainAddress == null) {
                this.blockchainAddress = 'http://71.237.161.227:5000/transaction';
                this.storage.set('blockchainAddress', this.blockchainAddress);
            } else {
                this.blockchainAddress = blockchainAddress;
            }
        });
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            if(graphproviderAddress == null) {
                this.graphproviderAddress = 'http://71.237.161.227:5000/get-graph-mobile';
                this.storage.set('graphproviderAddress', this.graphproviderAddress);
            } else {
                this.graphproviderAddress = graphproviderAddress;
            }
        });
        this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
            if(walletproviderAddress == null) {
                this.walletproviderAddress = 'http://71.237.161.227:5000/wallet';
                this.storage.set('walletproviderAddress', this.walletproviderAddress);
            } else {
                this.walletproviderAddress = walletproviderAddress;
            }
        });
    }

    save() {
        this.storage.set('baseAddress', this.baseAddress);
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
        this.storage.set('walletproviderAddress', this.walletproviderAddress);
    }
}