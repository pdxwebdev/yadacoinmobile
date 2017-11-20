import { Injectable } from '@angular/core';
import { HTTP } from '@ionic-native/http';

@Injectable()
export class OpenGraphParserService {
    html = null
    attrs = null;
    constructor(private http: HTTP) {
        this.attrs = {
            "title": "title",
            "document.title": "title",
        	"description": "description",
            "twitter:title": "title",
            "twitter:image": "image",
            "twitter:description": "description",
            "og:title": "title",
            "og:image": "image",
            "og:image:url": "image",
            "og:description": "description"
        }
    }

    parseFromUrl(url) {
        var output = {url: url};
    	this.html = '';
        return new Promise((resolve, reject) => {
            if (this.isURL(url)) {
                this.http.get(url, {}, {}).then((data) => {
                    this.html = data.data;
                }).then(() => {
                    if (this.isYouTubeURL(url)) {
                        var YTID = this.getYouTubeID(url);
                        output['image'] = 'https://img.youtube.com/vi/' + YTID + '/0.jpg'
                    }

                    for (var key in this.attrs) {
                        var attr = this.getAttr(key);

                        if (attr) {
                            var escape = document.createElement('textarea');
                            escape.innerHTML = attr;
                            output[this.attrs[key]] = escape.textContent;
                        }
                    }
                    resolve(output);
                });
            } else {
                resolve(false);
            }
        });
    }

    isURL(str) {
      var pattern = new RegExp('^(https?:\\/\\/)'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
      return pattern.test(str);
    }

    getYouTubeID(url) {
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match&&match[7].length==11)? match[7] : false;
    }

    isYouTubeURL(str) {
    	return str.indexOf('youtube.com') > -1 || str.indexOf('youtu.be') > -1 || str.indexOf('youtube-nocookie.com') > -1 ? true : false;
    }

    getAttr(attr) {
        var attrLocation = this.html.indexOf(attr);
        var beginningToAttr = this.html.substr(0, attrLocation);
        if (attr === 'title' || attr === 'description') {
        	var openTagEnd = beginningToAttr.indexOf('>');
            var tagBodyWithRemainder = this.html.substr(attrLocation + attr.length + 1);
            var closingTagStart = tagBodyWithRemainder.indexOf('</' + attr);
            var content = tagBodyWithRemainder.substr(0, closingTagStart);
            return content;
        } else {
            var reversed = beginningToAttr.split('').reverse().join('');
        	var find = 'atem<';
            var tagStart = reversed.indexOf(find);
            var tagWithRemainder = this.html.substr(beginningToAttr.length - tagStart - 5);
            var tagEnd = tagWithRemainder.indexOf('>');
            var tag = tagWithRemainder.substr(0, tagEnd + 1);
            var contentAttrStart = tag.indexOf('content');
            if (contentAttrStart < 0) {
                var contentAttrStart = tag.indexOf('value');
            }
            var contentAttrSub = tag.substr(contentAttrStart);
            var contentAttrStartQuote = contentAttrSub.indexOf('"');
            var contentWithRemainder = contentAttrSub.substr(contentAttrStartQuote + 1);
            var contentEnd = contentWithRemainder.indexOf('"');
            var content = contentWithRemainder.substr(0, contentEnd);
            return content;
        }
    }
}
