import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

declare var foobar;
declare var forge;

@Injectable()
export class BulletinSecretService {
    key = null;
    bulletin_secret = null;
    constructor(private storage: Storage) {
        this.storage.get('key').then((key) => {
            if(key && typeof key == 'string') {
                this.key = foobar.bitcoin.ECPair.fromWIF(key);
            } else {
                this.key = foobar.bitcoin.ECPair.makeRandom();
                this.storage.set('key', this.key.toWIF());
            }
            this.bulletin_secret = forge.sha256.create().update(this.key).digest().toHex();
        });
    }
}