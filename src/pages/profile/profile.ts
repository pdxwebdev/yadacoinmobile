import { Component } from '@angular/core';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';
import { ListPage } from '../list/list';
import { HTTP } from '@ionic-native/http';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';


@Component({
    selector: 'page-profile',
    templateUrl: 'profile.html'
})
export class ProfilePage {
    baseAddress: any;
    loadingModal: any;
    prev_name: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        private http: HTTP,
        private platform: Platform,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http,
        public loadingCtrl: LoadingController
    ) {
        this.prev_name = graphService.graph.human_hash;
        this.refresh();
    }

    refresh() {
        this.storage.get('baseAddress').then((baseAddress) => {
            this.baseAddress = baseAddress;
        });
    }

    change() {
        this.graphService.graph.human_hash = this.graphService.graph.human_hash.toLocaleLowerCase();
    }

    save() {
        this.loadingModal = this.loadingCtrl.create({
            content: 'Please wait...'
        });
        this.loadingModal.present();
        this.ahttp.post(
            this.baseAddress + '/change-username',
            {
                rid: this.graphService.rid,
                username: this.graphService.graph.human_hash,
                relationship: {
                    bulletin_secret: this.bulletinSecretService.bulletin_secret
                },
                to: this.bulletinSecretService.key.getAddress()
            }
        )
        .subscribe((data) => {
            return new Promise((resolve, reject) => {
                this.storage.get('usernames-' + this.prev_name)
                .then((key) => {
                    this.storage.remove('usernames-' + this.prev_name)
                    .then(() => {
                        this.storage.set('usernames-' + this.graphService.graph.human_hash, key)
                        .then(() => {
                            this.prev_name = this.graphService.graph.human_hash;
                            this.bulletinSecretService.set('usernames-' + this.graphService.graph.human_hash)
                            .then(() => {
                                resolve();
                            });
                        });
                    });
                });
            })
            .then(() => {
                this.loadingModal.dismiss();
                alert('saved!');
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