import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';

declare var forge;
declare var foobar;

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
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage, private bulletinSecretService: BulletinSecretService) {

        this.key = bulletinSecretService.key;
        this.bulletin_secret = bulletinSecretService.bulletin_secret;

        this.info = navParams.data;
        this.blockchainurl = this.info.blockchainurl;
        this.callbackurl = this.info.callbackurl;
        this.registerOrLogin()
    }

    registerOrLogin() {
        var rids = [this.bulletin_secret, this.info.bulletin_secret].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        this.rid = forge.sha256.create().update(rids[0] + rids[1]).digest().toHex();
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

            var rids = [this.bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
                return a.toLowerCase().localeCompare(b.toLowerCase());
            });
            this.rid = foobar.bitcoin.crypto.sha256(rids[0] + rids[1]).toString('hex');

            var challenge_code = this.info.challenge_code != undefined ? this.info.challenge_code : '';

            this.transaction = {
                rid:  this.rid,
                fee: 0.1,
                value: 1,
                requester_rid: typeof this.info.requester_rid == 'undefined' ? '' : this.info.requester_rid,
                requested_rid: typeof this.info.requested_rid == 'undefined' ? '' : this.info.requested_rid,
                challenge_code: challenge_code,
                answer: answer
            };

            
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
                this.transaction = {
                    rid: this.rid,
                    fee: 0.1,
                    value: 1,
                    requester_rid: '',
                    requested_rid: '',
                    challenge_code: challenge_code,
                    answer: answer
                };
                var hash = foobar.bitcoin.crypto.sha256(
                    this.transaction.rid +
                    this.transaction.value +
                    this.transaction.fee +
                    this.transaction.requester_rid +
                    this.transaction.requested_rid +
                    this.transaction.challenge_code +
                    this.transaction.answer                
                ).toString('hex')
            } else {
                // no relationship, attempt registration. This will also login the user.
                this.shared_secret = this.info.relationship.shared_secret;
                if (this.shared_secret != undefined) {
                    this.transaction.answer = this.shared_encrypt(this.shared_secret, challenge_code);                    
                } else {
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
                    this.transaction.answer          
                ).toString('hex')
            }
            this.transaction.hash = hash

            this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');

            this.transaction.id = this.get_transaction_id(hash, 4);
            this.sendTransaction();
            this.sendCallback();
            this.transaction.id = this.get_transaction_id(hash, 5);
            this.sendTransaction();
            this.sendCallback();
            this.transaction.id = this.get_transaction_id(hash, 12);
            this.sendTransaction();
            this.sendCallback();
        }
    }

    sendTransaction() {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.blockchainurl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(this.transaction));
    }

    sendCallback() {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.callbackurl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            bulletin_secret: this.bulletin_secret,
            shared_secret: this.shared_secret
        }));
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
