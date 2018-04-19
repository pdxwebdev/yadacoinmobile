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


@Component({
    selector: 'page-profile',
    templateUrl: 'profile.html'
})
export class ProfilePage {
    baseAddress: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        private http: HTTP,
        private platform: Platform,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http
    ) {
        this.refresh();
    }

    refresh() {
        this.storage.get('baseAddress').then((baseAddress) => {
            this.baseAddress = baseAddress;
        });
    }

    save() {
        if (this.platform.is('android') || this.platform.is('ios')) {
            this.http.post(
                this.baseAddress + '/change-username',
                {
                    rid: this.graphService.rid,
                    username: this.graphService.humanHash,
                    relationship: {
                        bulletin_secret: this.bulletinSecretService.bulletin_secret
                    },
                    to: this.bulletinSecretService.key.getAddress()
                },
                {'Content-Type': 'application/json'}
            ).then((data) => {
                return;
            });
        } else {
            this.ahttp.post(
                this.baseAddress + '/change-username',
                {
                    rid: this.graphService.rid,
                    username: this.graphService.humanHash,
                    relationship: {
                        bulletin_secret: this.bulletinSecretService.bulletin_secret
                    },
                    to: this.bulletinSecretService.key.getAddress()
                }
            )
            .subscribe((data) => {
                return;
            });
        }
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