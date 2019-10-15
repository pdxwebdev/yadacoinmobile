import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { BulletinSecretService } from './bulletinSecret.service';
import { AutoCompleteService } from 'ionic2-auto-complete';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';

@Injectable()
export class CompleteTestService implements AutoCompleteService {
  labelAttribute = "name";

  constructor(
      private http: Http,
      private settingsService: SettingsService,
      private bulletinSecretService: BulletinSecretService
  ) {}

  getResults(searchTerm:string) {
    return this.http.get(this.settingsService.remoteSettings['baseUrl'] + '/ns?searchTerm=' + searchTerm + '&bulletin_secret=' + this.bulletinSecretService.bulletin_secret)
    .map((res) => {
        var result = res.json().map(item => {
            return {name: item.relationship.their_username}
        });
        return result;
    });
  }
}