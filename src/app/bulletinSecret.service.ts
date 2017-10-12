import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

declare var elliptic;
declare var forge;

@Injectable()
export class BulletinSecretService {
    public_key = null;
    private_key = null;
    public_key_hex = null;
    private_key_hex = null;
    bulletin_secret = null;
    constructor(private storage: Storage) {

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
                this.public_key = keys.getPublic();
                this.private_key = keys.getPrivate();
                this.storage.set('keys', {
                    public_key: this.public_key_hex,
                    private_key: this.private_key_hex
                });
            }
            this.bulletin_secret = forge.sha256.create().update(this.private_key_hex).digest().toHex();
        });
    }
}