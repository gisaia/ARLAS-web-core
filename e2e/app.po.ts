import { browser, element, by } from 'protractor';

export class ARLASWebCorePage {
  navigateTo() {
    return browser.get('/');
  }

  getParagraphText() {
    return element(by.css('arlas-root h1')).getText();
  }
}
