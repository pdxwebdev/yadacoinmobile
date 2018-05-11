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
    ) {}

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
        return this.all().then((keys: any) => {
            if (keys.length === 0) {
                this.keyname = 'key';
            } else {
                keys.sort(function (a, b) {
                    if (a.idx < b.idx)
                      return -1
                    if ( a.idx > b.idx)
                      return 1
                    return 0
                });
                if (!this.keyname) {
                    this.storage.get('last-keyname').then((key) => {
                        if(key && typeof key == 'string') {
                            this.keyname = key;
                        } else {
                            this.keyname = keys[0].idx
                        }
                    });
                }
            }
            return this.settingsService.refresh().then(() => {
                return new Promise((resolve, reject) => {
                    this.storage.get(this.keyname).then((key) => {
                        if(key && typeof key == 'string') {
                            this.key = foobar.bitcoin.ECPair.fromWIF(key);
                        } else {
                            this.key = foobar.bitcoin.ECPair.makeRandom();
                            this.storage.set(this.keyname, this.key.toWIF());
                        }
                         
                        this.bulletin_secret = foobar.bitcoin.crypto.sha256(this.shared_encrypt(this.key.toWIF(), this.key.toWIF())).toString('hex');

                        this.ahttp.get(this.settingsService.baseAddress + '/faucet?address=' + this.key.getAddress()).subscribe(()=>{});

                        resolve();
                    });
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
        this.keyname = 'key-' + uuid4();
        return this.get();
    }

    all() {
        return new Promise((resolve, reject) => {
            var keykeys = [];
            this.storage.forEach((value, key) => {
                if (key.substr(0, 3) === 'key' || key.substr(0, 'usernames-'.length) === 'usernames-') {
                    keykeys.push({key: value, idx: key});
                }
            })
            .then(() => {
                this.keykeys = keykeys;
                resolve(keykeys);
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