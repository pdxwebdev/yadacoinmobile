import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { AutoCompleteService } from 'ionic2-auto-complete';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import { GraphService } from './graph.service';

@Injectable()
export class CompleteTestService implements AutoCompleteService {
  labelAttribute = "name";
  formValueAttribute = "value";

  constructor(
      private http: Http,
      private settingsService: SettingsService,
      private bulletinSecretService: BulletinSecretService,
      private graphService: GraphService
  ) {
  }

  getResults(searchTerm:string) {
    return this.graphService.graph.friends.concat(this.graphService.graph.groups)
    .filter((item) => {
      const username = item.relationship.username || item.relationship.identity.username;
      return username.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1
    })
    .map((item) => {
        const identity = item.relationship.identity || item.relationship;
        const value = {
          username: identity.username,
          username_signature: identity.username_signature,
          public_key: identity.public_key,
          collection: identity.collection
        }
        return {name: identity.username, value: value}
    });
  }
}