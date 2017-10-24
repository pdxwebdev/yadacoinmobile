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
                this.blockchainAddress = 'http://54.83.141.113/transaction';
                this.storage.set('blockchainAddress', this.blockchainAddress);
            } else {
                this.blockchainAddress = blockchainAddress;
            }
        });
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            if(graphproviderAddress == null) {
                this.graphproviderAddress = 'http://54.83.141.113/get-graph-mobile';
                this.storage.set('graphproviderAddress', this.graphproviderAddress);
            } else {
                this.graphproviderAddress = graphproviderAddress;
            }
        });
    }

    save() {
        this.storage.set('blockchainAddress', this.blockchainAddress);
        this.storage.set('graphproviderAddress', this.graphproviderAddress);
    }
}
