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
    constructor(public navCtrl: NavController, public navParams: NavParams, private settingsService: SettingsService) {
        this.baseAddress = settingsService.baseAddress;
        this.blockchainAddress = settingsService.blockchainAddress;
        this.graphproviderAddress = settingsService.graphproviderAddress;
    }

    dev_reset() {
        this.baseAddress = 'http://192.168.1.130:5000';
        this.blockchainAddress = 'http://192.168.1.130:5000/transaction';
        this.graphproviderAddress = 'http://192.168.1.130:5000/get-graph-mobile';
    }

    prod_reset() {
        this.baseAddress = 'http://34.237.46.10';
        this.blockchainAddress = 'http://34.237.46.10/transaction';
        this.graphproviderAddress = 'http://34.237.46.10/get-graph-mobile';
    }

    save() {
        this.settingsService.baseAddress = this.baseAddress;
        this.settingsService.blockchainAddress = this.blockchainAddress;
        this.settingsService.graphproviderAddress = this.graphproviderAddress;
        this.settingsService.save()
    }
}
