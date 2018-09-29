import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { ListPage } from '../list/list';
import { Http } from '@angular/http';
import { LoadingController } from 'ionic-angular';
import { SettingsService } from '../../app/settings.service';
import { Events } from 'ionic-angular';


@Component({
    selector: 'page-profile',
    templateUrl: 'profile.html'
})
export class ProfilePage {
    baseAddress: any;
    loadingModal: any;
    prev_name: any;
    username: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http,
        public loadingCtrl: LoadingController,
        public settingsService: SettingsService,
        public events: Events
    ) {
        this.refresh(null);
        this.bulletinSecretService.get().then(() => {
            if (this.bulletinSecretService.username) {
                this.ahttp.get(this.settingsService.baseAddress + '/faucet?address=' + this.bulletinSecretService.key.getAddress()).subscribe(()=>{});
            }
        });
    }

    refresh(refresher) {
        this.storage.get('baseAddress').then((baseAddress) => {
            this.baseAddress = baseAddress;
            if(refresher) refresher.complete();
        });
    }

    change() {
        this.username = this.username.toLocaleLowerCase();
    }

    save() {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.storage.get('usernames-').then((key) => {
            this.storage.set('usernames-' + this.username, key).then(() => {
                this.bulletinSecretService.set('usernames-' + this.username).then(() => {
                    this.loadingModal.dismiss();
                    alert('saved!');
                    this.events.publish('pages');
                    this.walletService.get();
                });
            });
        });
    }

    showChat() {
      var item = {pageTitle: {title:"Chat"}};
      this.navCtrl.push(ListPage, item);
    }

    showFriendRequests() {
      var item = {pageTitle: {title:"Friend Requests"}};
      this.navCtrl.push(ListPage, item);
    }
}