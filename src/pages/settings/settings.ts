import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    blockchainAddress = null
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage) {
        this.storage.get('blockchainAddress').then((blockchainAddress) => {
            if(blockchainAddress == null) {
                this.blockchainAddress = 'http://54.83.141.113';
                this.storage.set('blockchainAddress', this.blockchainAddress);
            } else {
                this.blockchainAddress = blockchainAddress;
            }
        });
    }

    save() {
        this.storage.set('blockchainAddress', this.blockchainAddress);
    }
}
