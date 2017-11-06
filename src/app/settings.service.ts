import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

@Injectable()
export class SettingsService {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.storage.get('baseAddress').then((baseAddress) => {
            if(baseAddress == null) {
                this.baseAddress = 'http://34.237.46.10';
                this.storage.set('baseAddress', this.baseAddress);
            } else {
                this.baseAddress = baseAddress;
            }
        });
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            if(blockchainAddress == null) {
                this.blockchainAddress = 'http://34.237.46.10/transaction';
                this.storage.set('blockchainAddress', this.blockchainAddress);
            } else {
                this.blockchainAddress = blockchainAddress;
            }
        });
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            if(graphproviderAddress == null) {
                this.graphproviderAddress = 'http://34.237.46.10/get-graph-mobile';
                this.storage.set('graphproviderAddress', this.graphproviderAddress);
            } else {
                this.graphproviderAddress = graphproviderAddress;
            }
        });
        this.storage.get('walletproviderAddress').then((walletproviderAddress) => {
            if(walletproviderAddress == null) {
                this.walletproviderAddress = 'http://34.237.46.10/wallet';
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