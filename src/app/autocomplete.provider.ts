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
      const friend = this.graphService.getIdentityFromTxn(item, this.settingsService.collections.CONTACT);
      const group = this.graphService.getIdentityFromTxn(item, this.settingsService.collections.GROUP);
      return (friend || group).username.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1
    })
    .map((item) => {
        const friend = this.graphService.getIdentityFromTxn(item, this.settingsService.collections.CONTACT);
        const group = this.graphService.getIdentityFromTxn(item, this.settingsService.collections.GROUP);
        const identity = friend || group;
        return {name: identity.username, value: this.graphService.toIdentity(identity)}
    });
  }
}