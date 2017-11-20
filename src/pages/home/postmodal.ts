import { Component } from '@angular/core';
import { NavController, NavParams, ModalController, ViewController } from 'ionic-angular';
import { WalletService } from '../../app/wallet.service';
import { GraphService } from '../../app/graph.service';
import { AlertController } from 'ionic-angular';
import { TransactionService } from '../../app/transaction.service';
import { OpenGraphParserService } from '../../app/opengraphparser.service'

@Component({
    selector: 'modal-post',
    templateUrl: 'postmodal.html'
})
export class PostModal {
	blockchainAddress = null;
	postText = null;
	logicalParent = null;
    post = null;
    constructor(
        public navParams: NavParams,
        public viewCtrl: ViewController,
        private walletService: WalletService,
        private graphService: GraphService,
        private alertCtrl: AlertController,
        private transactionService: TransactionService,
        private openGraphParserService: OpenGraphParserService
    ) {
        this.blockchainAddress = navParams.data.blockchainAddress;
        this.logicalParent = navParams.data.logicalParent;
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

	            console.log(status);

	            let alert = this.alertCtrl.create();
	            alert.setTitle('Approve Transaction');
	            alert.setSubTitle('You are about to spend 0.01 coins ( 0.01 fee)');
	            alert.addButton('Cancel');
	            alert.addButton({
	                text: 'Confirm',
	                handler: (data: any) => {
	                    // camera permission was granted
	                    this.transactionService.pushTransaction({
	                        relationship: {
	                            postText: this.postText 
	                        },
	                        blockchainurl: this.blockchainAddress,
	                        resolve: resolve
	                    });
	                }
	            });
	            alert.present();
        	}).then(() => {
        		this.dismiss();
        	});
        });
    }

    dismiss() {
    	this.logicalParent.refresh();
    	this.viewCtrl.dismiss();
    }
}