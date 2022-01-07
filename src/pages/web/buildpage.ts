import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';
import { WebSocketService } from '../../app/websocket.service';
import { TransactionService } from '../../app/transaction.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';


declare var X25519;

@Component({
    selector: 'page-buildpage',
    templateUrl: 'buildpage.html'
})
export class BuildPagePage {
  resource: any;
    pageText: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        private websocketService: WebSocketService,
        private transactionService: TransactionService,
        private alertCtrl: AlertController
    ) {}

    save() {
      let alert = this.alertCtrl.create();
      alert.setTitle('Create web page');
      alert.setSubTitle('Are you sure you want to save this page?');
      alert.addButton({
          text: 'Continue editing'
      });
      alert.addButton({
          text: 'Save',
          handler: (data: any) => {
            this.resource = '';
            this.pageText = '';
            let identity = this.graphService.toIdentity(JSON.parse(this.bulletinSecretService.identityJson()))
            identity.collection = this.settingsService.collections.WEB_PAGE;
            const rids = this.graphService.generateRids(identity)
            this.websocketService.newtxn({resource: this.resource, content: this.pageText}, rids, this.settingsService.collections.WEB_PAGE)
          }
      });
      alert.present();
    }

}