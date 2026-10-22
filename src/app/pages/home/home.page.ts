import { Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { AnimeCardComponent } from '../../components/anime-card/anime-card.component';
import { Anime } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';

type EstadoLista = 'cargando' | 'error' | 'vacio' | 'lista';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    AnimeCardComponent,
  ],
})
export class HomePage implements OnInit {
  private readonly svc = inject(AnimeService);

  /** Lista acumulada: se concatena, nunca se reemplaza al paginar. */
  readonly items = signal<Anime[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly error = signal(false);
  readonly hasMore = signal(true);

  @ViewChild(IonInfiniteScroll) private infinite?: IonInfiniteScroll;

  /** Ids ya mostrados: la API puede solapar páginas y aquí se corta el duplicado. */
  private readonly ids = new Set<string>();
  private offset = 0;

  readonly totalTexto = computed(() => this.total().toLocaleString('es-EC'));

  readonly estado = computed<EstadoLista>(() => {
    if (this.cargando() && this.items().length === 0) {
      return 'cargando';
    }
    if (this.error() && this.items().length === 0) {
      return 'error';
    }
    if (this.items().length === 0) {
      return 'vacio';
    }
    return 'lista';
  });

  ngOnInit(): void {
    void this.cargar();
  }

  /**
   * Una página por llamada. Guard `cargando` (sin peticiones simultáneas),
   * `hasMore` calculado con `meta.count` y `complete()` incondicional en `finally`.
   */
  async cargar(): Promise<void> {
    if (this.cargando() || !this.hasMore()) {
      this.infinite?.complete();
      return;
    }

    this.cargando.set(true);
    this.error.set(false);

    try {
      const res = await firstValueFrom(this.svc.getAnime('', this.offset));
      const nuevos = res.items.filter((a) => !this.ids.has(a.id));
      nuevos.forEach((a) => this.ids.add(a.id));

      this.items.update((prev) => [...prev, ...nuevos]);
      this.offset = res.offset + this.svc.pageSize;
      this.total.set(res.total);
      this.hasMore.set(res.hasMore);
    } catch {
      // El offset no avanza: el reintento pide exactamente la misma página.
      this.error.set(true);
    } finally {
      this.cargando.set(false);
      this.infinite?.complete();
    }
  }
}
