import { Component } from '@angular/core';
import { NavController, NavParams, ModalController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';
import { WalletService } from '../../app/wallet.service';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';
import { AlertController, LoadingController } from 'ionic-angular';


@Component({
    selector: 'page-userdetail',
    templateUrl: 'userdetail.html'
})
export class UserDetailPage {
    user: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public storage: Storage,
        public walletService: WalletService,
        private platform: Platform,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http,
        public loadingCtrl: LoadingController,
        private settingsService: SettingsService
    ) {
        this.user = navParams.get('user')
    }

    blockUser() {
        this.ahttp.post(
            this.settingsService.baseAddress + '/block-user',
            {
                'user': this.user.username,
                'bulletin_secret': this.bulletinSecretService.bulletin_secret
            }
        )
        .subscribe((res) => {
            alert('User has been blocked')
        });
    }
}