import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

import { CoreComponent } from './core.component';
import { ArlasService } from '../services/arlas.service';
import { CollaborativesearchService } from '../services/collaborativesearch.service';

@NgModule({
  declarations: [
    CoreComponent
  ],
  imports: [
    HttpModule
  ],
  providers: [ArlasService,CollaborativesearchService],
  bootstrap: [CoreComponent]
})
export class CoreModule { }
