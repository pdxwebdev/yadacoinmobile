import { Injectable } from '@angular/core';


@Injectable()
export class SettingsService {
    remoteSettings: any = {};
    remoteSettingsUrl = null;
    tokens = {};
    menu = '';
    collections = {
      AFFILIATE: 'affiliate',
      ASSET: 'asset',
      BID: 'bid',
      CONTACT: 'contact',
      CALENDAR: 'event_meeting',
      CHAT: 'chat',
      CHAT_FILE: 'chat_file',
      CONTRACT: 'contract',
      CONTRACT_SIGNED: 'contract_signed',
      GROUP: 'group',
      GROUP_CALENDAR: 'group_event_meeting',
      GROUP_CHAT: 'group_chat',
      GROUP_CHAT_FILE_NAME: 'group_chat_file_name',
      GROUP_CHAT_FILE: 'group_chat_file',
      GROUP_MAIL: 'group_mail',
      MAIL: 'mail',
      MARKET: 'market',
      PERMISSION_REQUEST: 'permission_request',
      SIGNATURE_REQUEST: 'signature_request',
      SMART_CONTRACT: 'smart_contract',
      WEB_CHALLENGE_REQUEST: 'web_challenge_request',
      WEB_CHALLENGE_RESPONSE: 'web_challenge_response',
      WEB_PAGE: 'web_page',
      WEB_PAGE_REQUEST: 'web_page_request',
      WEB_PAGE_RESPONSE: 'web_page_response',
      WEB_SIGNIN_REQUEST: 'web_signin_request',
      WEB_SIGNIN_RESPONSE: 'web_signin_response'
    }
    constructor(
    ) {
        this.tokens = {};
    }

    go() {
        return new Promise((resolve, reject) => {

        });
    }
}