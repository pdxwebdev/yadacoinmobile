import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';

@Injectable()
export class SettingsService {
    remoteSettings = {};
    remoteSettingsUrl = null;
    constructor(
        private storage: Storage,
        private ahttp: Http
    ) {
        
    }

    go() {
        return new Promise((resolve, reject) => {
            this.ahttp.get(this.remoteSettingsUrl + '/yada_config.json').subscribe((res) => {
                this.remoteSettings = JSON.parse(res['_body']);
                resolve();
            });
        });
    }
}