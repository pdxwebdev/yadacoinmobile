import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    blockchainAddress = null
    graphproviderAddress = null
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage) {
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
    }

    dev_reset() {
        this.blockchainAddress = 'http://192.168.1.130:5000/transaction';
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.graphproviderAddress = 'http://192.168.1.130:5000/get-graph-mobile';
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
    }

    prod_reset() {
        this.blockchainAddress = 'http://34.237.46.10/transaction';
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.graphproviderAddress = 'http://34.237.46.10/get-graph-mobile';
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
    }

    save() {
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
    }
}
