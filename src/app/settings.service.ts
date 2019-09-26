import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { Http } from '@angular/http';
import { ToastController } from 'ionic-angular';


@Injectable()
export class SettingsService {
    remoteSettings = {};
    remoteSettingsUrl = null;
    seeds = [];
    constructor(
        private storage: Storage,
        private ahttp: Http,
        public toastCtrl: ToastController,
    ) {}

    go() {}
}