import { Injectable } from '@angular/core';


@Injectable()
export class SettingsService {
    remoteSettings: any;
    remoteSettingsUrl = null;
    tokens = {};
    constructor(
    ) {
        this.tokens = {};
    }

    go() {
        return new Promise((resolve, reject) => {

        });
    }
}