import { TestBed, inject } from '@angular/core/testing';

import { CollaborativesearchService } from './collaborativesearch.service';

describe('CollaborativesearchService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CollaborativesearchService]
    });
  });

  it('should ...', inject([CollaborativesearchService], (service: CollaborativesearchService) => {
    expect(service).toBeTruthy();
  }));
});
