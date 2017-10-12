import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

@Injectable()
export class GraphService {
    graph: any;
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.storage.get('blockchainurl').then((blockchainurl) => {
            this.http.get('http://192.168.1.55:5000/get-graph-mobile?bulletin_secret='+bulletinSecret.bulletin_secret, {}, {}).then((res) => {
                this.graph = JSON.parse(res.data);
            });
        });
    }

    getGraph() {
        return this.graph;
    }
}