import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

declare var foobar;
declare var forge;

@Injectable()
export class BulletinSecretService {
    key = null;
    bulletin_secret = null;
    constructor(private storage: Storage) {
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
        var keyname = 'key';
        return this.storage.get(keyname).then((key) => {
            if(key && typeof key == 'string') {
                this.key = foobar.bitcoin.ECPair.fromWIF(key);
            } else {
                this.key = foobar.bitcoin.ECPair.makeRandom();
                this.storage.set(keyname, this.key.toWIF());
            }
             
            this.bulletin_secret = foobar.bitcoin.crypto.sha256(this.shared_encrypt(this.key.toWIF(), this.key.toWIF())).toString('hex');
        });
    }
}