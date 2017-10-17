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
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage, private bulletinSecretService: BulletinSecretService) {

        this.key = bulletinSecretService.key;

        if (navParams.data.type == 'scan_friend') {
            this.scan_friend(navParams.data);
        } else if (navParams.data.type == 'login') {
            this.login(navParams.data);
        } else if (navParams.data.type == 'post') {
            this.post(navParams.data);
        }
    }

    scan_friend(data) {
        this.info = data;
        this.blockchainurl = this.info.blockchainurl;
        var callbackurl = this.info.callbackurl;
        var my_bulletin_secret = foobar.bitcoin.crypto.sha256(this.key.toWIF()).toString('hex');
        var rids = [my_bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        this.transaction = {
            relationship: this.encrypt(),
            rid:  foobar.bitcoin.crypto.sha256(rids[0] + rids[1]).toString('hex'),
            fee: 0.1,
            value: 1,
            requester_rid: typeof this.info.requester_rid == 'undefined' ? '' : this.info.requester_rid,
            requested_rid: typeof this.info.requested_rid == 'undefined' ? '' : this.info.requested_rid,
            challenge_code: typeof this.info.challenge_code == 'undefined' ? '' : this.info.challenge_code
        };
        var hash = foobar.bitcoin.crypto.sha256(
            this.transaction.rid +
            this.transaction.relationship +
            this.transaction.value +
            this.transaction.fee +
            this.transaction.requester_rid +
            this.transaction.requested_rid +
            this.transaction.challenge_code
        ).toString('hex')
        this.transaction.hash = hash

        this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');
        var combine = new Uint8Array(hash.length + 2);
        combine[0] = 0;
        combine[1] = 64;
        for (var i = 0; i < hash.length; i++) {
            combine[i+2] = hash.charCodeAt(i)
        }
        var shaMessage = foobar.bitcoin.crypto.sha256(foobar.bitcoin.crypto.sha256(combine));
        var signature = this.key.sign(shaMessage);
        var compact = signature.toCompact(0, true);
        this.transaction.id = foobar.base64.fromByteArray(compact);

        console.log(this.transaction);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", this.blockchainurl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(this.transaction));

        var xhr = new XMLHttpRequest();
        xhr.open("POST", callbackurl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            shared_secret: this.info.relationship.shared_secret,
            bulletin_secret: my_bulletin_secret
        }));
    }
    login(data) {
        this.info = data;
        this.callbackurl = this.info.callbackurl;
        this.blockchainurl = this.info.blockchainurl;
        var my_bulletin_secret = forge.sha256.create().update(this.key.toWIF).digest().toHex();
        var rids = [my_bulletin_secret, this.info.bulletin_secret].sort(function (a, b) {
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
            for (var i=0; i < transactions.length; i++) {
                var encrypted_relationship = transactions[i].relationship;
                var decrypted_relationship = this.decrypt(encrypted_relationship);
                if (decrypted_relationship.data.indexOf('shared_secret') > 0) {
                    var shared_secret = JSON.parse(decrypted_relationship.data).shared_secret;
                    break;
                }
            }
            var challenge_code = this.info.challenge_code;
            var answer = this.shared_encrypt(shared_secret, challenge_code);
            this.transaction = {
                challenge_code: challenge_code,
                answer: answer,
                rid: this.rid,
                fee: 0.1,
                value: 1,
                requester_rid: '',
                requested_rid: ''
            };
            this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');
            console.log(this.transaction);


            this.transaction.hash = forge.sha256.create().update(
                this.transaction.rid +
                this.transaction.value +
                this.transaction.fee +
                this.transaction.requester_rid +
                this.transaction.requested_rid +
                this.transaction.challenge_code +
                this.transaction.answer                
            ).digest().toHex()

            var msgHash = foobar.bitcoin.crypto.sha256(foobar.bitcoin.crypto.sha256(JSON.stringify(this.transaction.hash)));
            var signature = this.key.sign(msgHash);
            var compact = signature.toCompact(0, true);
            this.transaction.id = foobar.base64.fromByteArray(compact);

            var xhr = new XMLHttpRequest();
            xhr.open("POST", this.blockchainurl, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(this.transaction));
        }
    }

    post(data) {
        this.info = data;
        this.storage.get('blockchainurl').then((blockchainurl) => {
            this.blockchainurl = blockchainurl;
            this.transaction = {
                post_text: this.shared_encrypt(this.key.toWIF(), data.post_text),
                fee: 0.1,
            };
            var msgHash = foobar.bitcoin.crypto.sha256(foobar.bitcoin.crypto.sha256(JSON.stringify(this.transaction)));
            var signature = this.key.sign(msgHash);
            var compact = signature.toCompact(0, true);
            this.transaction.id = this.byteArrayToHexString(compact);
            this.transaction.public_key = this.key.getPublicKeyBuffer().toString('hex');

            this.xhr = new XMLHttpRequest();
            this.xhr.open('POST', this.blockchainurl, true);
            this.xhr.setRequestHeader('Content-Type', 'application/json');
            this.xhr.onreadystatechange = () => {
                //this.postReadyStateChange();
            }
            this.xhr.send(JSON.stringify(this.transaction));
        });

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
