import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';


@Component({
    selector: 'page-signaturerequest',
    templateUrl: 'signaturerequest.html'
})
export class SignatureRequestPage {
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
    ) {}
}