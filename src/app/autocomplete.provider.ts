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
    this.graphService.getFriends();
  }

  getResults(searchTerm:string) {
    return this.graphService.graph.friends.map((item) => {
        const value = {
          username: item.relationship.my_username,
          username_signature: item.relationship.my_username_signature,
          public_key: item.relationship.my_public_key
        }
        return {name: item.relationship.my_username, value: value}
    });
  }
}