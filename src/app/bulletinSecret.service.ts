import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { SettingsService } from './settings.service';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { Platform } from 'ionic-angular';


declare var foobar;
declare var forge;
declare var uuid4;

@Injectable()
export class BulletinSecretService {
    key = null;
    bulletin_secret = null;
    keyname = null;
    keykeys = null;
    constructor(
        private settingsService: SettingsService,
        private storage: Storage,
        private http: HTTP,
        private platform: Platform,
        private ahttp: Http
    ) {
        this.keyname = 'key';
        this.get();
    }

    shared_encrypt(shared_secret, message) {
        var key = forge.pkcs5.pbkdf2(forge.sha256.create().update(shared_secret).digest().toHex(), 'salt', 400, 32);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        var iv = '';
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(iv + message));
        cipher.finish()
        return cipher.output.toHex()
    }

    get() {
        var keyname = this.keyname;
        return this.settingsService.refresh().then(() => {
            return new Promise((resolve, reject) => {
                this.storage.get(keyname).then((key) => {
                    if(key && typeof key == 'string') {
                        this.key = foobar.bitcoin.ECPair.fromWIF(key);
                    } else {
                        this.key = foobar.bitcoin.ECPair.makeRandom();
                        this.storage.set(keyname, this.key.toWIF());
                    }
                     
                    this.bulletin_secret = foobar.bitcoin.crypto.sha256(this.shared_encrypt(this.key.toWIF(), this.key.toWIF())).toString('hex');
                    if (this.platform.is('android') || this.platform.is('ios')) {
                        this.http.get(this.settingsService.baseAddress + '/faucet', {'address': this.key.getAddress()}, {});
                    } else {
                        this.ahttp.get(this.settingsService.baseAddress + '/faucet?address=' + this.key.getAddress()).subscribe(()=>{});
                    }
                    resolve();
                });
            });
        });
    }

    set(key) {
        return new Promise((resolve, reject) => {

            this.keyname = key;
            this.get().
            then(() => {
                resolve();
            });
        });
    }

    create() {
        var key = this.keyname;
        this.keyname = 'key-' + uuid4();
        var res = this.get();
        this.keyname = key;
        return res;
    }

    all() {
        this.keykeys = [];
        return new Promise((resolve, reject) => {
            this.storage.forEach((value, key) => {
                if (key.substr(0, 3) === 'key') {
                    this.keykeys.push(key);
                }
            })
            .then(() => {
                resolve(this.keykeys);
            });
        });
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

    hexToBytes(s) {
        var arr = []
        for (var i = 0; i < s.length; i += 2) {
            var c = s.substr(i, 2);
            arr.push(parseInt(c, 16));
        }
        return String.fromCharCode.apply(null, arr);
    }
}