import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { AnimeCardComponent } from '../../components/anime-card/anime-card.component';
import { PanelEstadoComponent } from '../../components/panel-estado/panel-estado.component';
import { Anime } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { FavoritesService } from '../../services/favorites.service';

type EstadoFavoritos = 'cargando' | 'vacio' | 'error' | 'lista';

/**
 * Favoritos locales (R6). Solo se guardan **ids**: aquí se piden a la API las
 * fichas que falten, de una en una (Kitsu limita a 3 peticiones por segundo) y
 * reutilizando lo ya cargado al volver a entrar.
 */
@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    AnimeCardComponent,
    PanelEstadoComponent,
  ],
})
export class FavoritesPage implements OnInit {
  private readonly favs = inject(FavoritesService);
  private readonly svc = inject(AnimeService);
  private readonly router = inject(Router);

  readonly items = signal<Anime[]>([]);
  readonly cargando = signal(true);
  /** Fichas que la API no devolvió: se avisa, no se esconde. */
  readonly fallidos = signal(0);

  private generacion = 0;
  private entrado = false;

  ngOnInit(): void {
    void this.cargar();
  }

  /** La vista se cachea: al volver a entrar se refresca la lista. */
  ionViewWillEnter(): void {
    if (this.entrado) {
      void this.cargar();
    }
    this.entrado = true;
  }

  readonly total = this.favs.total;

  readonly estado = computed<EstadoFavoritos>(() => {
    if (this.cargando() && this.items().length === 0) {
      return 'cargando';
    }
    if (this.items().length > 0) {
      return 'lista';
    }
    return this.fallidos() > 0 ? 'error' : 'vacio';
  });

  readonly resumen = computed(() => {
    const total = this.total();
    if (total === 0) {
      return 'Todavía no has marcado ningún título';
    }
    return total === 1 ? '1 título guardado en este dispositivo' : `${total} títulos guardados en este dispositivo`;
  });

  /** Quita el favorito y lo saca de la lista en el mismo gesto. */
  async quitar(id: string): Promise<void> {
    await this.favs.quitar(id);
    this.items.update((prev) => prev.filter((a) => a.id !== id));
  }

  async reintentar(): Promise<void> {
    await this.cargar();
  }

  irAlCatalogo(): void {
    void this.router.navigateByUrl('/home');
  }

  private async cargar(): Promise<void> {
    if (this.cargando() && this.generacion > 0) {
      return; // un toque repetido en "Reintentar" no dispara dos barridos
    }
    const gen = ++this.generacion;
    this.cargando.set(true);
    this.fallidos.set(0);

    try {
      await this.favs.init(); // seguro si el arranque ya lo hizo
      const ids = [...this.favs.ids()];
      if (gen !== this.generacion) {
        return;
      }

      const previos = new Map(this.items().map((a) => [a.id, a]));
      const resultado: Anime[] = [];
      let fallidos = 0;

      for (const id of ids) {
        if (gen !== this.generacion) {
          return; // otra carga tomó el turno
        }
        const previo = previos.get(id);
        if (previo) {
          resultado.push(previo);
          continue;
        }
        try {
          resultado.push(await firstValueFrom(this.svc.getAnimeById(id)));
        } catch {
          fallidos += 1;
        }
        if (gen === this.generacion) {
          this.items.set([...resultado]); // progreso visible mientras pide
          this.fallidos.set(fallidos);
        }
      }

      if (gen === this.generacion) {
        this.items.set(resultado); // lista final (también vacía tras quitar todo)
        this.fallidos.set(fallidos);
      }
    } finally {
      if (gen === this.generacion) {
        this.cargando.set(false);
      }
    }
  }
}
