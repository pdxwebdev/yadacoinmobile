import { Component } from '@angular/core';
import { AlertController, NavController, NavParams } from 'ionic-angular';
import { GraphService } from '../../app/graph.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { SettingsService } from '../../app/settings.service';
import { WebSocketService } from '../../app/websocket.service';
import { TransactionService } from '../../app/transaction.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { identity } from 'rxjs';
import { Http } from '@angular/http';


declare var X25519;
declare var foobar;
declare var forge;

@Component({
    selector: 'create-asset',
    templateUrl: 'createasset.html'
})
export class CreateAssetPage {
    username: any;
    data: any;
    busy: any;
    filepath: any;
    filedata: any;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public graphService: GraphService,
        private bulletinSecretService: BulletinSecretService,
        public settingsService: SettingsService,
        private websocketService: WebSocketService,
        private transactionService: TransactionService,
        private alertCtrl: AlertController,
        private ahttp: Http
    ) {}
    
    changeListener($event) {
      this.busy = true;
      if(!$event.target.files[0]) {
        this.filedata = '';
        return;
      }
      this.filepath = $event.target.files[0].name;
      const reader = new FileReader();
      reader.readAsDataURL($event.target.files[0]);
      reader.onload = () => {
        this.data = reader.result.toString();
        if(this.data.length > 5000) {
          alert('File too large. Please select a smaller file.');
          return
        }
        this.filedata = this.data
      };
      reader.onerror = () => {};
    }

    save() {
      let alert = this.alertCtrl.create();
      alert.setTitle('Create Asset');
      alert.setSubTitle('Are you sure you want to save this asset?');
      alert.addButton({
          text: 'Continue editing'
      });

      const key = foobar.bitcoin.ECPair.makeRandom();
      const wif = key.toWIF();
      const username_signature = foobar.base64.fromByteArray(key.sign(foobar.bitcoin.crypto.sha256(this.username)).toDER());
      const public_key = key.getPublicKeyBuffer().toString('hex');
      const identity = {
        username: this.username,
        username_signature: username_signature,
        public_key: public_key,
        wif: wif,
        collection: this.settingsService.collections.ASSET
      }
      try {
        this.data = JSON.parse(this.data);
      } catch(err) {

      }
      alert.addButton({
          text: 'Save',
          handler: (data: any) => {
            const rids = this.graphService.generateRids(identity, null, this.settingsService.collections.ASSET)
            this.websocketService.newtxn(
              {
                identity: identity,
                data: this.data,
                checksum: forge.sha256.create().update(this.data + identity.username_signature).digest().toHex()
              },
              rids,
              this.settingsService.collections.ASSET
            )
            .then(() => {
              this.navCtrl.pop();
            })
          }
      });
      alert.present();
    }

}