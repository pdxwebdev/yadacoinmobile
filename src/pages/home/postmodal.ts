import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { AlertController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { OpenGraphParserService } from '../../app/opengraphparser.service'
import { SettingsService } from '../../app/settings.service';
import { Http, Headers, RequestOptions } from '@angular/http';
import { BulletinSecretService } from '../../app/bulletinSecret.service';

declare var Base64

@Component({
    selector: 'modal-post',
    templateUrl: 'postmodal.html'
})
export class PostModal {
	blockchainAddress = null;
	postText = null;
	logicalParent = null;
    post = {};
    files = null;
    selectedFile = null;
    constructor(
        public navParams: NavParams,
        public viewCtrl: ViewController,
        private walletService: WalletService,
        private alertCtrl: AlertController,
        private transactionService: TransactionService,
        private openGraphParserService: OpenGraphParserService,
        private settingsService: SettingsService,
        private bulletinSecretService: BulletinSecretService,
        private ahttp: Http
    ) {
        this.blockchainAddress = navParams.data.blockchainAddress;
        this.logicalParent = navParams.data.logicalParent;
        let headers = new Headers();
        headers.append('Authorization', 'basic ' + Base64.encode(this.settingsService.remoteSettings['siaPassword']));
        let options = new RequestOptions({ headers: headers, withCredentials: true });
        this.ahttp.get(this.settingsService.remoteSettings['siaUrl'] + '/renter/files', options)
        .subscribe((res) => {
            this.files = res.json()['files'];
        })
    }

    change() {
    	if (this.openGraphParserService.isURL(this.postText)) {
    	    this.openGraphParserService.parseFromUrl(this.postText).then((data) => {
                this.post = data;
            });
        }
    }

    submit() {
        this.walletService.get().then(() => {
        	return new Promise((resolve, reject) => {
                if (this.selectedFile) {

                    this.ahttp.get(this.settingsService.remoteSettings['siaUrl'] + '/renter/shareascii?siapaths=' + this.selectedFile[0])
                    .subscribe((res) => {
                        let sharefiledata = res.json()['asciisia'];
                        this.approveTxn(sharefiledata, resolve);
                    })
                } else {
                    this.approveTxn(null, resolve);
                }
	            console.log(status);
        	}).then(() => {
        		this.dismiss();
        	});
        });
    }

    approveTxn(sharefiledata, resolve) {
        let alert = this.alertCtrl.create();
        alert.setTitle('Approve Transaction');
        alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
        alert.addButton('Cancel');
        alert.addButton({
            text: 'Confirm',
            handler: (data: any) => {
                // camera permission was granted
                new Promise((resolve, reject) => {
                    if (sharefiledata) {
                        return this.transactionService.generateTransaction({
                            relationship: {
                                postText: this.postText,
                                postFile: sharefiledata,
                                postFileName: this.selectedFile[0]
                            }
                        })
                        .then(() => {
                            resolve()
                        })
                        .catch((err) => {
                            reject();
                        });
                    } else {
                        return this.transactionService.generateTransaction({
                            relationship: {
                                postText: this.postText
                            }
                        })
                        .then(() => {
                            resolve()
                        })
                        .catch((err) => {
                            reject();
                        });
                    }
                })
                .then(() => {
                    return this.transactionService.getFastGraphSignature();
                })
                .then((hash) => {
                    return this.transactionService.sendTransaction();
                })
                .then(() => {
                    this.dismiss();
                    this.logicalParent.refresh(null);
                })
                .catch((err) => {
                    console.log('could not generate hash');
                });
            }
        });
        alert.present();
    }

    dismiss() {
    	this.logicalParent.refresh();
    	this.viewCtrl.dismiss();
    }
}