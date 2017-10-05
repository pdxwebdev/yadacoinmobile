import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

declare var forge;
declare var elliptic;

@Component({
  selector: 'page-transaction',
  templateUrl: 'transaction.html'
})

export class Transaction {
    info = null;
    transaction = null;
    constructor(public navCtrl: NavController, public navParams: NavParams) {
        var ec = elliptic.ec('secp256k1');
        var key = ec.genKeyPair();
        this.info = navParams.data;
        this.transaction = {
            relationship: this.encrypt(),
            rid: forge.sha256.create(key.getPrivate('hex')).digest().toHex() + this.info.relationship.bulletin_secret,
            fee: 0.1,
            value: 1,
            requester_rid: null,
            requested_rid: null
        };
        var msgHash = elliptic.utils.toArray(JSON.stringify(this.transaction));
        var signature = key.sign(msgHash);
        var derSign = signature.toDER();
        this.transaction.id = this.byteArrayToHexString(derSign);
        this.transaction.public_key = forge.sha256.create(key.getPublic('hex')).digest().toHex();
        console.log(this.transaction);
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
        var key = forge.pkcs5.pbkdf2(this.info.relationship.shared_secret, 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = forge.random.getBytesSync(16);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + JSON.stringify(this.info.relationship)));
        cipher.finish()
        return cipher.output.toHex()
    }

    decrypt(s) {
        var key = forge.pkcs5.pbkdf2('TBD', 'salt', 400, 32);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        var enc = this.hexToBytes(s);
        decipher.start({iv: enc.slice(0,16)});
    }
}
