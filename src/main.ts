import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { environment } from './environments/environment';
import { CoreModule } from './core/core.module';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(CoreModule);
