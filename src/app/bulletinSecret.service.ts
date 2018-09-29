import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { Storage } from '@ionic/storage';
import { Events } from 'ionic-angular';


declare var foobar;
declare var forge;
declare var uuid4;

@Injectable()
export class BulletinSecretService {
    key = null;
    bulletin_secret = null;
    keyname = null;
    keykeys = null;
    username = null;
    constructor(
        private settingsService: SettingsService,
        private storage: Storage,
        public events: Events
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
        return new Promise((resolve, reject) => {
            return this.all().then((keys: any) => {
                return this.settingsService.refresh().then(() => {
                    if (keys.length === 0) {
                        this.keyname = 'usernames-';
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
                                this.setKey(resolve);
                            });
                        } else {
                            this.setKey(resolve);
                        }
                    }
                });
            });
        });
    }

    setKey(resolve) {
        this.storage.get(this.keyname).then((key) => {
            if(key && typeof key == 'string') {
                if (this.keyname.substr('usernames-'.length) == '') {
                    this.username = '';
                    this.key = foobar.bitcoin.ECPair.fromWIF(key);
                    this.bulletin_secret = this.generate_bulletin_secret();
                    this.storage.set(this.keyname, key);
                } else {
                    this.key = foobar.bitcoin.ECPair.fromWIF(key);
                    this.username = this.keyname.substr('usernames-'.length);
                    this.bulletin_secret = this.generate_bulletin_secret();
                }
            } else {
                if (this.keyname.substr('usernames-'.length) == '') {
                    this.username = '';
                    this.key =  null;
                    this.bulletin_secret = null;
                    this.storage.set(this.keyname, '');
                } else {
                    this.username = this.keyname.substr('usernames-'.length);
                    this.key = foobar.bitcoin.ECPair.makeRandom();
                    this.storage.set(this.keyname, this.key.toWIF());
                    this.bulletin_secret = this.generate_bulletin_secret();
                }
            }

            resolve();
        });
    }

    generate_bulletin_secret() {
        return foobar.base64.fromByteArray(this.key.sign(foobar.bitcoin.crypto.sha256(this.username)).toDER());
    }

    set(key) {
        return new Promise((resolve, reject) => {
            this.storage.set('last-keyname', key);
            this.storage.remove('usernames-');
            this.keyname = key;
            this.get().
            then(() => {
                resolve();
            });
        });
    }

    create() {
        this.keyname = 'usernames-';
        this.storage.set('last-keyname', this.keyname)
        return this.get().then(() => {

        });
    }

    import (keyWif) {
        return new Promise((resolve, reject) => {
            this.keyname = 'usernames-';
            this.storage.set('last-keyname', this.keyname);
            this.storage.set(this.keyname, keyWif.trim());
            this.get().
            then(() => {
                resolve();
            });
        });
    }

    all() {
        return new Promise((resolve, reject) => {
            var keykeys = [];
            this.storage.forEach((value, key) => {
                if (key.substr(0, 'usernames-'.length) === 'usernames-') {
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