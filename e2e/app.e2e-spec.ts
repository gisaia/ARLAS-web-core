import { ARLASWebCorePage } from './app.po';

describe('arlas-web-core App', () => {
  let page: ARLASWebCorePage;

  beforeEach(() => {
    page = new ARLASWebCorePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('arlas works!');
  });
});
