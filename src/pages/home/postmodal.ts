import { Component } from '@angular/core';
import { NavParams, ViewController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { AlertController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { OpenGraphParserService } from '../../app/opengraphparser.service'
import { SettingsService } from '../../app/settings.service';
import { Http, Headers, RequestOptions } from '@angular/http';

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
        private http: Http
    ) {
        this.blockchainAddress = navParams.data.blockchainAddress;
        this.logicalParent = navParams.data.logicalParent;
        let headers = new Headers();
        headers.append('Authorization', 'basic ' + Base64.encode(this.settingsService.siaPassword));
        let options = new RequestOptions({ headers: headers, withCredentials: true });
        this.http.get(this.settingsService.siaAddress + '/renter/files', options)
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

                    this.http.get(this.settingsService.siaAddress + '/renter/shareascii?siapaths=' + this.selectedFile[0])
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

                if (sharefiledata) {
                    this.transactionService.pushTransaction({
                        relationship: {
                            postText: this.postText,
                            postFile: sharefiledata,
                            postFileName: this.selectedFile[0]
                        },
                        blockchainurl: this.blockchainAddress,
                        resolve: resolve
                    });
                } else {
                    this.transactionService.pushTransaction({
                        relationship: {
                            postText: this.postText
                        },
                        blockchainurl: this.blockchainAddress,
                        resolve: resolve
                    });
                }
            }
        });
        alert.present();
    }

    dismiss() {
    	this.logicalParent.refresh();
    	this.viewCtrl.dismiss();
    }
}