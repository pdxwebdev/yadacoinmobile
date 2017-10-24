import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

@Injectable()
export class GraphService {
    graph: any;
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            this.http.get(graphproviderAddress + '?bulletin_secret='+bulletinSecret.bulletin_secret, {}, {}).then((res) => {
                this.graph = JSON.parse(res.data);
            });
        });
    }

    getGraph() {
        return this.graph;
    }
}