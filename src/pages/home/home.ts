import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { Transaction } from '../transaction/transaction';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  qrData = null;
  createdCode = null;
  scannedCode = null;

  constructor(public navCtrl: NavController, private qrScanner: QRScanner) {

  }

  createCode() {
    this.createdCode = this.qrData;
  }

  scan_friend() {
    this.qrScanner.prepare().then((status: QRScannerStatus) => {
        console.log(status);
        if (status.authorized) {
           // camera permission was granted


           // start scanning
           let scanSub = this.qrScanner.scan().subscribe((text: string) => {
             console.log('Scanned something', text);
             let info = JSON.parse(text);
             this.navCtrl.push(Transaction, {
                 relationship: {
                     bulletin_secret: info.bulletin_secret,
                     shared_secret: info.shared_secret
                 },
                 requester_rid: info.requester_rid,
                 requested_rid: info.requested_rid,
                 blockchainurl: info.blockchainurl,
                 callbackurl: info.callbackurl,
                 type: 'register'
             })
             this.qrScanner.hide(); // hide camera preview
             scanSub.unsubscribe(); // stop scanning
             window.document.querySelector('ion-app').classList.remove('transparentBody');
           });
           console.log(this.qrScanner);
           this.qrScanner.resumePreview();
           // show camera preview
           this.qrScanner.show();
           window.document.querySelector('ion-app').classList.add('transparentBody');
           // wait for user to scan something, then the observable callback will be called

         } else if (status.denied) {
           // camera permission was permanently denied
           // you must use QRScanner.openSettings() method to guide the user to the settings page
           // then they can grant the permission from there
         } else {
           // permission was denied, but not permanently. You can ask for permission again at a later time.
         }
        })
        .catch((e: any) => console.log('Error is', e));
    
  }

  login() {
    this.qrScanner.prepare().then((status: QRScannerStatus) => {
        console.log(status);
        if (status.authorized) {
           // camera permission was granted


           // start scanning
           let scanSub = this.qrScanner.scan().subscribe((text: string) => {
             console.log('Scanned something', text);
             let info = JSON.parse(text);
             this.navCtrl.push(Transaction, {
                 bulletin_secret: info.bulletin_secret,
                 callbackurl: info.callbackurl,
                 challenge_code: info.challenge_code,
                 type: 'login'
             })
             this.qrScanner.hide(); // hide camera preview
             scanSub.unsubscribe(); // stop scanning
             window.document.querySelector('ion-app').classList.remove('transparentBody');
           });
           console.log(this.qrScanner);
           this.qrScanner.resumePreview();
           // show camera preview
           this.qrScanner.show();
           window.document.querySelector('ion-app').classList.add('transparentBody');
           // wait for user to scan something, then the observable callback will be called

         } else if (status.denied) {
           // camera permission was permanently denied
           // you must use QRScanner.openSettings() method to guide the user to the settings page
           // then they can grant the permission from there
         } else {
           // permission was denied, but not permanently. You can ask for permission again at a later time.
         }
        })
        .catch((e: any) => console.log('Error is', e));

  }

}
