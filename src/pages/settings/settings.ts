import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { SettingsService } from '../../app/settings.service';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})

export class Settings {
    baseAddress = null
    blockchainAddress = null
    graphproviderAddress = null
    walletproviderAddress = null
    constructor(public navCtrl: NavController, public navParams: NavParams, private settingsService: SettingsService) {
        this.baseAddress = settingsService.baseAddress;
        this.blockchainAddress = settingsService.blockchainAddress;
        this.graphproviderAddress = settingsService.graphproviderAddress;
        this.walletproviderAddress = settingsService.walletproviderAddress;
    }

    dev_reset() {
        this.baseAddress = 'http://71.237.161.227:5000/';
        this.blockchainAddress = this.baseAddress + 'transaction';
        this.graphproviderAddress = this.baseAddress + 'get-graph-mobile';
        this.walletproviderAddress = this.baseAddress + 'wallet';
    }

    prod_reset() {
        this.baseAddress = 'http://34.237.46.10';
        this.blockchainAddress = 'http://34.237.46.10/transaction';
        this.graphproviderAddress = 'http://34.237.46.10/get-graph-mobile';
        this.walletproviderAddress = 'http://34.237.46.10/wallet';
    }

    save() {
        this.settingsService.baseAddress = this.baseAddress;
        this.settingsService.blockchainAddress = this.blockchainAddress;
        this.settingsService.graphproviderAddress = this.graphproviderAddress;
        this.settingsService.walletproviderAddress = this.walletproviderAddress;
        this.settingsService.save()
    }
}
