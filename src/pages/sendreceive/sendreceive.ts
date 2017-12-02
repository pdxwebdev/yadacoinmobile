import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { TransactionService } from '../../app/transaction.service';
import { BulletinSecretService } from '../../app/bulletinSecret.service'
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner';
import { SettingsService } from '../../app/settings.service';
import { SocialSharing } from '@ionic-native/social-sharing';

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
    constructor(
        private qrScanner: QRScanner,
        private transactionService: TransactionService,
        private alertCtrl: AlertController,
        private bulletinSecretService: BulletinSecretService,
        private walletService: WalletService,
        private socialSharing: SocialSharing,
        private settingsService: SettingsService
    ) {
        this.createdCode = bulletinSecretService.key.getAddress();
        this.refreshWallet();
    }

    scan() {
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
        if (!this.address) {
            var alert = this.alertCtrl.create();
            alert.setTitle('Enter an address');
            alert.addButton('Ok');
            alert.present();
            return
        }
        if (!value) {
            var alert = this.alertCtrl.create();
            alert.setTitle('Enter an amount');
            alert.addButton('Ok');
            alert.present();
            return
        }
        var alert = this.alertCtrl.create();
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend ' + total + ' coins (' + this.value + ' coin + 0.01 fee)');
        alert.addButton('Cancel');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                new Promise((resolve, reject) => {
                    this.transactionService.pushTransaction({
                        blockchainurl: this.settingsService.blockchainAddress,
                        to: this.address,
                        value: value,
                        resolve: resolve
                    });
                }).then((txn) => {
                    var alert = this.alertCtrl.create();
                    alert.setTitle('Transaction Sent');
                    alert.setSubTitle('Your transaction has been sent succefully.');
                    alert.addButton('Ok');
                    alert.present();
                    this.value = null;
                    this.address = null;
                    this.refreshWallet();
                });
            }
        });
        alert.present();
    }
    refreshWallet() {
        this.loadingBalance = true;
        this.walletService.get()
        .then(() => {
            this.loadingBalance = false;
            this.balance = this.walletService.wallet.balance;
        });
    }

    shareAddress() {
        this.socialSharing.share(this.bulletinSecretService.key.getAddress(), "Send Yada Coin to this address!");
    }
}