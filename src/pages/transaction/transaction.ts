import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Storage } from '@ionic/storage';

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
    constructor(public navCtrl: NavController, public navParams: NavParams, private storage: Storage) {
        this.storage.get('keys').then((keys) => {
            var ec = elliptic.ec('secp256k1');
            if(keys && typeof keys.public_key == 'string' && typeof keys.private_key == 'string') {
                this.public_key_hex = keys.public_key;
                this.private_key_hex = keys.private_key;
                this.public_key = ec.keyFromPublic(keys.public_key, 'hex');
                this.private_key = ec.keyFromPrivate(keys.private_key, 'hex');
            } else {
                var keys = ec.genKeyPair();
                this.public_key_hex = keys.getPublic('hex');
                this.private_key_hex = keys.getPrivate('hex');
                this.public_key = keys.public_key;
                this.private_key = keys.private_key;
                this.storage.set('keys', {
                    public_key: this.public_key,
                    private_key: this.private_key
                });
            }
            if (navParams.data.type == 'register') {
                this.register(navParams.data);
            } else if (navParams.data.type == 'login') {
                this.login(navParams.data);
            }
        });
    }

    register(data) {
        this.info = data;
        var blockchainurl = this.info.blockchainurl;
        var callbackurl = this.info.callbackurl;
        var my_bulletin_secret = forge.sha256.create().update(this.private_key_hex).digest().toHex();
        this.transaction = {
            relationship: this.encrypt(),
            rid:  forge.sha256.create().update(my_bulletin_secret + this.info.relationship.bulletin_secret).digest().toHex(),
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
    login(data) {
        this.info = data;
        this.callbackurl = this.info.callbackurl;
        var my_bulletin_secret = forge.sha256.create().update(this.private_key_hex).digest().toHex();
        this.rid = forge.sha256.create().update(my_bulletin_secret + this.info.bulletin_secret).digest().toHex();
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', 'http://192.168.1.130:5000/transaction?rid=' + this.rid, true);
        this.xhr.onreadystatechange = () => {
            this.readyStateChange();
        }
        this.xhr.send();
    }

    readyStateChange() {
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
