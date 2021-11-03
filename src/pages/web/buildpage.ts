import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
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
        private transactionService: TransactionService
    ) {}

    save() {
      this.websocketService.webpage({resource: this.resource, content: this.pageText})
    }

}