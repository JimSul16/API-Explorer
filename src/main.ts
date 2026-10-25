import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  albumsOutline,
  calendarOutline,
  checkmarkDoneOutline,
  closeCircle,
  cloudOfflineOutline,
  heart,
  heartOutline,
  searchOutline,
  star,
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { FavoritesService } from './app/services/favorites.service';

// Los iconos se registran una sola vez: ion-icon no descarga nada en runtime.
addIcons({
  star,
  heart,
  heartOutline,
  cloudOfflineOutline,
  searchOutline,
  checkmarkDoneOutline,
  closeCircle,
  calendarOutline,
  albumsOutline,
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideHttpClient(withFetch()),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    // Los favoritos se leen antes del primer render: la estrella ya sale marcada.
    provideAppInitializer(() => inject(FavoritesService).init()),
  ],
});
