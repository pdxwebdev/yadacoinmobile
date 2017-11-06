import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { AlertController } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';
import { WalletService } from '../../app/wallet.service';

declare var forge;
declare var foobar;
declare var uuid4;

@Component({
  selector: 'page-transaction',
  templateUrl: 'transaction.html'
})

export class Transaction {
    info = null;
    transaction = null;
    key = null;
    xhr = null;
    rid = null;
    callbackurl = null;
    blockchainurl = null;
    bulletin_secret = null;
    shared_secret = null;
    to = null;
    attempts = null;
    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        private storage: Storage,
        private walletService: WalletService,
        private bulletinSecretService: BulletinSecretService,
        private alertCtrl: AlertController
    ) {

        this.key = bulletinSecretService.key;
        this.bulletin_secret = bulletinSecretService.bulletin_secret;

        this.info = navParams.data;
        this.blockchainurl = this.info.blockchainurl;
        this.callbackurl = this.info.callbackurl;
        this.to = this.info.to;
        this.registerOrLogin()
    }

    registerOrLogin() {
        var bulletin_secrets = [this.bulletin_secret, this.info.bulletin_secret].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        this.rid = forge.sha256.create().update(bulletin_secrets[0] + bulletin_secrets[1]).digest().toHex();
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', this.blockchainurl + '?rid=' + this.rid, true);
        this.xhr.onreadystatechange = () => {
            this.loginReadyStateChange();
        }
        this.xhr.send();
    }

    loginReadyStateChange() {
        if (this.xhr.readyState === 4) {
            var transactions = JSON.parse(this.xhr.responseText);

            var bulletin_secrets = [this.bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            this.rid = foobar.bitcoin.crypto.sha256(bulletin_secrets[0] + bulletin_secrets[1]).toString('hex');

            var challenge_code = this.info.challenge_code != undefined ? this.info.challenge_code : '';

            this.transaction = {
                rid:  this.rid,
                fee: 0.1,
                value: 1,
                requester_rid: typeof this.info.requester_rid == 'undefined' ? '' : this.info.requester_rid,
                requested_rid: typeof this.info.requested_rid == 'undefined' ? '' : this.info.requested_rid,
                challenge_code: challenge_code,
                answer: answer,
                to: this.to
            };
            var transaction_total = this.transaction.value + this.transaction.fee;
            if (this.walletService.wallet.balance < transaction_total || this.walletService.wallet.unspent_transactions.length == 0) {
                this.cancelTransaction()
                return
            } else {
                var inputs = [];
                var input_sum = 0
                for (var i=0; i<this.walletService.wallet.unspent_transactions.length; i++) {
                    var unspent_transaction = this.walletService.wallet.unspent_transactions[i];
                    inputs.push(unspent_transaction);
                    input_sum += parseFloat(unspent_transaction.value);
                    if (input_sum >= transaction_total) {
                        break;
                    }
                }
            }
            if (input_sum < transaction_total) {
                this.cancelTransaction();
                return
            }
            this.transaction.inputs = inputs;

            var inputs_hashes = [];
            for(var i=0; i < inputs.length; i++) {
                inputs_hashes.push(inputs[i].hash);
            }

            var inputs_hashes_arr = inputs_hashes.sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });

            var inputs_hashes_concat = inputs_hashes_arr.join('')

            if (transactions.length > 0) {
                // existing relationship, attempt login
                var found = false;
                for (var i=0; i < transactions.length; i++) {
                    var encrypted_relationship = transactions[i].relationship;
                    var decrypted_relationship = this.decrypt(encrypted_relationship);
                    if (decrypted_relationship.data.indexOf('shared_secret') > 0) {
                        this.shared_secret = JSON.parse(decrypted_relationship.data).shared_secret;
                        found = true;
                        break;
                    }
                }
                var answer = this.shared_encrypt(this.shared_secret, challenge_code);

                this.transaction.answer = answer;

                var hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.rid +
                    this.transaction.value +
                    this.transaction.fee +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    this.transaction.challenge_code +
                    this.transaction.answer +
                    this.transaction.to +
                    inputs_hashes_concat
                ).toString('hex')
            } else if (this.info.confirm_friend === true) {
                this.shared_secret = this.info.relationship.shared_secret;
                this.transaction.answer = '';
                this.transaction.relationship = this.shared_encrypt(this.shared_secret, uuid4()); 
                var hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.value +
                    this.transaction.fee +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    this.transaction.to +
                    inputs_hashes_concat
                ).toString('hex')
            } else {
                // no relationship, attempt registration. This will also login the user.
                this.shared_secret = this.info.relationship.shared_secret;
                if (this.shared_secret != undefined) {
                    this.transaction.answer = this.shared_encrypt(this.shared_secret, challenge_code);                    
                } else {
                    this.info.relationship.shared_secret = uuid4();
                    this.transaction.answer = '';
                }
                this.transaction.relationship = this.encrypt()
                var hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.rid +
                    this.transaction.relationship +
                    this.transaction.value +
                    this.transaction.fee +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    this.transaction.challenge_code +
                    this.transaction.answer +
                    this.transaction.to +
                    inputs_hashes_concat
                ).toString('hex')
            }
            this.transaction.hash = hash

            this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');
            this.attempts = [12, 5, 4];
            var attempt = this.attempts.pop();
            this.transaction.id = this.get_transaction_id(hash, attempt);
            this.sendTransaction();
            this.sendCallback();
        }
    }
    _this = null;
    url = null;
    onError() {
        if (this._this.attempts.length > 0) {
            var attempt = this._this.attempts.pop();
            this._this.transaction.id = this._this.get_transaction_id(this._this.transaction.hash, attempt);
            if (this.url == this._this.blockchainurl) {
                this._this.sendTransaction();
            }
            if (this.url == this._this.callbackurl) {
                this._this.sendCallback();
            }
        }
    }

    sendTransaction() {
        this.xhr = new XMLHttpRequest();
        this.xhr._this = this;
        this.xhr.url = this.blockchainurl;
        this.xhr.open("POST", this.blockchainurl, true);
        this.xhr.setRequestHeader('Content-Type', 'application/json');
        this.xhr.onerror = this.onError;
        this.xhr.send(JSON.stringify(this.transaction));
    }

    sendCallback() {
        this.xhr = new XMLHttpRequest();
        this.xhr._this = this;
        this.xhr.url = this.callbackurl;
        this.xhr.open("POST", this.callbackurl, true);
        this.xhr.setRequestHeader('Content-Type', 'application/json');
        this.xhr.send(JSON.stringify({
            bulletin_secret: this.bulletin_secret,
            shared_secret: this.shared_secret,
            to: this.key.getAddress()
        }));
    }

    cancelTransaction() {
        let alert = this.alertCtrl.create();
        alert.setTitle('Insufficient Funds');
        alert.setSubTitle('You do not have enough money for this transaction.');
        alert.addButton('Ok');
        alert.present();
    }

    get_transaction_id(hash, trynum) {
        var combine = new Uint8Array(hash.length + 2);
        combine[0] = 0;
        combine[1] = 64;
        for (var i = 0; i < hash.length; i++) {
            combine[i+2] = hash.charCodeAt(i)
        }
        var shaMessage = foobar.bitcoin.crypto.sha256(foobar.bitcoin.crypto.sha256(combine));
        var signature = this.key.sign(shaMessage);
        var compact = signature.toCompact(trynum, false);
        return foobar.base64.fromByteArray(compact);
    }

    direct_message(data) {
        //placeholder
    }

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }

    byteArrayToHexString(byteArray) {
        var callback = function(byte) {
            return ('0' + (byte & 0xFF).toString(16)).slice(-2);
        }
        return Array.from(byteArray, callback).join('')
    }

    encrypt() {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + JSON.stringify(this.info.relationship)));
        cipher.finish()
        return cipher.output.toHex()
    }

    shared_encrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + message));
        cipher.finish()
        return cipher.output.toHex()
    }

    decrypt(message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.key.toWIF()).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output
    }

    shared_decrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(message);
        decipher.start({iv: enc.slice(0,16)});
        decipher.update(forge.util.createBuffer(enc.slice(16)));
        decipher.finish();
        return decipher.output
    }
}
