import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';
import { Storage } from '@ionic/storage';
import { BulletinSecretService } from './bulletinSecret.service';

@Injectable()
export class GraphService {
    graph: any;
    graphproviderAddress: any;
    xhr: any;
    constructor(private storage: Storage, private http: HTTP, private bulletinSecret: BulletinSecretService) {
        this.storage.get('graphproviderAddress').then((graphproviderAddress) => {
            this.graphproviderAddress = graphproviderAddress;
        });
    }

    getGraph(callback) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open('GET', this.graphproviderAddress + '?bulletin_secret='+this.bulletinSecret.bulletin_secret, true);
        this.xhr.onreadystatechange = () => {
            if (this.xhr.readyState === 4) {
                this.graph = JSON.parse(this.xhr.responseText);
                callback();
            }
        }
        this.xhr.send();
    }
}