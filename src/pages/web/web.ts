import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';
import { WebSocketService } from '../../app/websocket.service';
import { TransactionService } from '../../app/transaction.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { CompleteTestService } from '../../app/autocomplete.provider';


declare var foobar;

@Component({
    selector: 'page-web',
    templateUrl: 'web.html'
})
export class WebPage {
    recipient: any;
    resource: any;
    content: any;
    challenge: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        private websocketService: WebSocketService,
        private completeTestService: CompleteTestService
    ) {
      this.recipient = this.navParams.get('recipient')
      this.resource = this.navParams.get('resource')
      this.content = this.navParams.get('content')
    }


    go() {
      return new Promise((resolve, reject) => {
        return this.websocketService.directMessageRequest(
          this.recipient,
          this.settingsService.collections.WEB_PAGE_REQUEST,
          { resource: this.resource },
          resolve
        )
      })
      .then((item: any) => {
        return this.content = item.relationship[this.settingsService.collections.WEB_PAGE_RESPONSE].content;
      })
    }

    signIn() {
      let identity;
      let url;
      const key = foobar.bitcoin.ECPair.makeRandom();
      return new Promise((resolve, reject) => {
        return this.websocketService.directMessageRequest(
          this.recipient,
          this.settingsService.collections.WEB_CHALLENGE_REQUEST,
          {},
          resolve
        )
      })
      .then((item: any) => {
        const username = item.relationship[this.settingsService.collections.WEB_CHALLENGE_RESPONSE].challenge;
        identity = {
          wif: key.toWIF(),
          username: username,
          username_signature: foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(username)).toDER()),
          public_key: key.getPublicKeyBuffer().toString('hex')
        }
        url = item.relationship[this.settingsService.collections.WEB_CHALLENGE_RESPONSE].url;
        return new Promise((resolve, reject) => {
          return this.websocketService.directMessageRequest(
            this.recipient,
            this.settingsService.collections.WEB_SIGNIN_REQUEST,
            identity,
            resolve
          )
        })
      })
      .then((identityTxn: any) => {
        if (identity.wif !== identityTxn.relationship[this.settingsService.collections.WEB_SIGNIN_RESPONSE].wif) return;
        if (identity.username !== identityTxn.relationship[this.settingsService.collections.WEB_SIGNIN_RESPONSE].username) return;
        var iframe;
        iframe = document.createElement('iframe');
        iframe.id = 'myFrame';
        const urlObject = new URL(url)
        iframe.src = urlObject.href;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.onload = () => {
          window.frames['myFrame'].contentWindow.postMessage(identity, urlObject.origin);
          window.open(urlObject.href, '_blank')
          iframe.parentNode.removeChild(iframe);
        }
      })
    }

    myForm = new FormGroup({
        searchTerm: new FormControl('', [Validators.required])
    })
}