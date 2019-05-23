import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { ToastController } from 'ionic-angular';

@Injectable()
export class SettingsService {
    remoteSettings = {};
    remoteSettingsUrl = null;
    constructor(
        private storage: Storage,
        private ahttp: Http,
        public toastCtrl: ToastController
    ) {
        
    }

    go() {
        return new Promise((resolve, reject) => {
            if(!this.remoteSettingsUrl) {
                const toast = this.toastCtrl.create({
                    message: 'Enter an address up top',
                    duration: 2000
                });
                toast.present();
                return resolve();
            }
            let remoteSettingsUrl = '';
            if (this.remoteSettingsUrl.substr(-1) === '/') {
                remoteSettingsUrl = this.remoteSettingsUrl.substr(0, this.remoteSettingsUrl.length-1);
            } else {
                remoteSettingsUrl = this.remoteSettingsUrl;
            }
            this.ahttp.get(remoteSettingsUrl + '/yada_config.json').subscribe(
                (res) => {
                    this.remoteSettings = res.json();
                    resolve();
                },
                (err) => {
                    const toast = this.toastCtrl.create({
                        message: 'Network error',
                        duration: 2000
                    });
                    toast.present();
                    return reject();
                }
            );
        });
    }
}