import { TestBed, inject } from '@angular/core/testing';

import { ArlasService } from './arlas.service';

describe('ArlasService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ArlasService]
    });
  });

  it('should ...', inject([ArlasService], (service: ArlasService) => {
    expect(service).toBeTruthy();
  }));
});
