import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from '../../app/bulletinSecret.service';

declare var forge;
declare var elliptic;

@Component({
  selector: 'page-transaction',
  templateUrl: 'transaction.html'
})

export class Transaction {
    info = null;
    transaction = null;
    public_key = null;
    private_key = null;
    public_key_hex = null;
    private_key_hex = null;
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage, private bulletinSecretService: BulletinSecretService) {
        this.storage.get('blockchainurl').then((blockchainurl) => {
            this.blockchainurl = blockchainurl;
        });

        this.public_key_hex = bulletinSecretService.public_key_hex;
        this.private_key_hex = bulletinSecretService.private_key_hex;
        this.public_key = bulletinSecretService.public_key;
        this.private_key = bulletinSecretService.private_key;

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
        var blockchainurl = this.info.blockchainurl;
        this.storage.set('blockchainurl', blockchainurl);
        var callbackurl = this.info.callbackurl;
        var my_bulletin_secret = forge.sha256.create().update(this.private_key_hex).digest().toHex();
        var rids = [my_bulletin_secret, this.info.relationship.bulletin_secret].sort(function (a, b) {
            return a.toLowerCase().localeCompare(b.toLowerCase());
        });
        this.transaction = {
            relationship: this.encrypt(),
            rid:  forge.sha256.create().update(rids[0] + rids[1]).digest().toHex(),
            fee: 0.1,
            value: 1,
            requester_rid: this.info.requester_rid,
            requested_rid: this.info.requested_rid
        };
        var msgHash = elliptic.utils.toArray(JSON.stringify(this.transaction));
        var signature = this.private_key.sign(msgHash);
        var derSign = signature.toDER();
        this.transaction.id = this.byteArrayToHexString(derSign);
        this.transaction.public_key = this.public_key_hex;
        console.log(this.transaction);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", blockchainurl, true);
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
    xhr = null;
    rid = null;
    callbackurl = null;
    blockchainurl = null;
    login(data) {
        this.info = data;
        this.callbackurl = this.info.callbackurl;
        this.blockchainurl = this.info.blockchainurl;
        this.storage.set('blockchainurl', this.info.blockchainurl);
        var my_bulletin_secret = forge.sha256.create().update(this.private_key_hex).digest().toHex();
        this.rid = forge.sha256.create().update(my_bulletin_secret + this.info.bulletin_secret).digest().toHex();
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', this.blockchainurl + '?rid=' + this.rid, true);
        this.xhr.onreadystatechange = () => {
            this.loginReadyStateChange();
        }
        this.xhr.send();
    }

    loginReadyStateChange() {
        if (this.xhr.readyState === 4) {
            var transaction = JSON.parse(this.xhr.responseText);
            var encrypted_relationship = transaction.relationship;
            var decrypted_relationship = this.decrypt(encrypted_relationship);
            var shared_secret = JSON.parse(decrypted_relationship).shared_secret;
            var challenge_code = this.info.challenge_code;
            var answer = this.shared_encrypt(shared_secret, challenge_code);
            this.transaction = {
                challenge_code: challenge_code,
                answer: answer,
                rid: this.rid,
                fee: 0.1,
                value: 1,
                requester_rid: null,
                requested_rid: null
            };
            var msgHash = elliptic.utils.toArray(JSON.stringify(this.transaction));
            var signature = this.private_key.sign(msgHash);
            var derSign = signature.toDER();
            this.transaction.id = this.byteArrayToHexString(derSign);
            this.transaction.public_key = this.public_key_hex;
            console.log(this.transaction);

            var xhr = new XMLHttpRequest();
            xhr.open("POST", this.callbackurl, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(this.transaction));
        }
    }

    post(data) {
        this.info = data;

        this.transaction = {
            post_text: this.shared_encrypt(this.private_key_hex, data.post_text),
            fee: 0.1,
        };
        var msgHash = elliptic.utils.toArray(JSON.stringify(this.transaction));
        var signature = this.private_key.sign(msgHash);
        var derSign = signature.toDER();
        this.transaction.id = this.byteArrayToHexString(derSign);
        this.transaction.public_key = this.public_key_hex;

        this.xhr = new XMLHttpRequest();
        this.xhr.open('POST', this.blockchainurl, true);
        this.xhr.setRequestHeader('Content-Type', 'application/json');
        this.xhr.onreadystatechange = () => {
            //this.postReadyStateChange();
        }
        this.xhr.send(JSON.stringify(this.transaction));

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
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.private_key_hex).digest().toHex(), 'salt', 400, 32);
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
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(this.private_key_hex).digest().toHex(), 'salt', 400, 32);
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
