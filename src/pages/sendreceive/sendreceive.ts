import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service'
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { SettingsService } from '../../app/settings.service';
import { SocialSharing } from '@ionic-native/social-sharing';
import { ListPage } from '../list/list';

@Component({
  selector: 'page-sendreceive',
  templateUrl: 'sendreceive.html'
})

export class SendReceive {
    value = null;
    createdCode = null;
    address = null;
    loadingBalance: any;
    balance = null;
    isDevice = null;
    constructor(
        private navCtrl: NavController,
        private qrScanner: QRScanner,
        private transactionService: TransactionService,
        private alertCtrl: AlertController,
        private bulletinSecretService: BulletinSecretService,
        private walletService: WalletService,
        private socialSharing: SocialSharing,
        private settingsService: SettingsService
    ) {
        this.bulletinSecretService.get().then(() => {
            this.createdCode = bulletinSecretService.key.getAddress();
            this.refresh(null);
        });
    }

    scan() {
        if (!document.URL.startsWith('http') || document.URL.startsWith('http://localhost:8080')) {
            this.isDevice = true;
        } else {
            this.isDevice = false;
        }
        this.qrScanner.prepare().then((status: QRScannerStatus) => {
            console.log(status);
            if (status.authorized) {
                // start scanning
                let scanSub = this.qrScanner.scan().subscribe((text: string) => {
                    console.log('Scanned address', text);
                    this.address = text;
                    this.qrScanner.hide(); // hide camera preview
                    scanSub.unsubscribe(); // stop scanning
                    window.document.querySelector('ion-app').classList.remove('transparentBody');
                });
            }
        });
        this.qrScanner.resumePreview();
        // show camera preview
        this.qrScanner.show();
        window.document.querySelector('ion-app').classList.add('transparentBody');
    }

    submit() {
        var value = parseFloat(this.value)
        var total = value + 0.01;

        var alert = this.alertCtrl.create();
        if (!this.address) {
            alert.setTitle('Enter an address');
            alert.addButton('Ok');
            alert.present();
            return
        }
        if (!value) {
            alert.setTitle('Enter an amount');
            alert.addButton('Ok');
            alert.present();
            return
        }
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend ' + total + ' coins (' + this.value + ' coin + 0.001 fee)');
        alert.addButton('Cancel');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                new Promise((resolve, reject) => {
                    this.transactionService.generateTransaction({
                        to: this.address,
                        value: value,
                        resolve: resolve
                    });
                }).then((txn) => {
                    var title = 'Transaction Sent';
                    var message = 'Your transaction has been sent succefully.';
                    if (!txn) {
                        title = 'Insufficient Funds'
                        message = "Not enough YadaCoins for transaction.";
                    }
                    var alert = this.alertCtrl.create();
                    alert.setTitle(title);
                    alert.setSubTitle(message);
                    alert.addButton('Ok');
                    alert.present();
                    this.value = null;
                    this.address = null;
                    this.refresh(null);
                });
            }
        });
        alert.present();
    }
    refresh(refresher) {
        this.loadingBalance = true;
        this.walletService.get()
        .then(() => {
            this.loadingBalance = false;
            this.balance = this.walletService.wallet.balance;
            if(refresher) refresher.complete();
        });
    }

    shareAddress() {
        this.socialSharing.share(this.bulletinSecretService.key.getAddress(), "Send Yada Coin to this address!");
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