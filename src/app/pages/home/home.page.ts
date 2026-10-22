import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
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
import { Anime, FalloApi } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';

type EstadoLista = 'cargando' | 'error' | 'vacio' | 'lista';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly hasMore = signal(true);
  /** El fin no vino de `meta.count` sino de una página sin títulos nuevos. */
  readonly finSinProgreso = signal(false);

  /**
   * Último fallo clasificado. Su presencia **pausa el scroll automático**
   * (`[disabled]` del infinite scroll): así un fallo persistente no encadena
   * peticiones al esconderse el spinner; el reintento lo decide el usuario.
   */
  readonly fallo = signal<FalloApi | null>(null);
  readonly error = computed(() => this.fallo() !== null);

  @ViewChild(IonInfiniteScroll) private infinite?: IonInfiniteScroll;

  /** Ids ya mostrados: la API puede solapar páginas y aquí se corta el duplicado. */
  private readonly ids = new Set<string>();
  private offset = 0;

  readonly totalTexto = computed(() => this.total().toLocaleString('es-EC'));

  /** Causa del fallo en lenguaje humano (la del panel y la del aviso inline). */
  readonly mensajeFallo = computed(() => {
    const fallo = this.fallo();
    if (!fallo) {
      return '';
    }
    switch (fallo.tipo) {
      case 'red':
        return 'No hay conexión con la API. Revisa tu red e inténtalo de nuevo.';
      case 'limite':
        return 'Demasiadas peticiones seguidas. Espera unos segundos y reintenta.';
      case 'servidor':
        return `Kitsu está fallando (error ${fallo.status}). Espera un momento y reintenta.`;
      case 'cliente':
        return `La API rechazó la petición (error ${fallo.status}). Reintenta en unos segundos.`;
    }
  });

  /** Etiqueta corta para la cabecera, alineada con el tipo de fallo. */
  private readonly etiquetaFallo = computed(() => {
    switch (this.fallo()?.tipo) {
      case 'red':
        return 'Sin conexión con la API';
      case 'limite':
        return 'Demasiadas peticiones';
      case 'servidor':
        return 'La API respondió con error';
      case 'cliente':
        return 'Petición rechazada por la API';
      default:
        return 'Error al cargar el catálogo';
    }
  });

  /** Texto de cabecera que nunca contradice al estado visible. */
  readonly resumen = computed(() => {
    if (this.items().length > 0) {
      return this.total() > 0
        ? `${this.totalTexto()} títulos · cargados ${this.items().length}`
        : `Cargados ${this.items().length} títulos`;
    }
    if (this.estado() === 'error') {
      return this.etiquetaFallo();
    }
    if (this.estado() === 'vacio') {
      return 'La API no devolvió títulos';
    }
    return 'Conectando con Kitsu…';
  });

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

  /** Vuelve al inicio del catálogo (estado vacío o error de la primera página). */
  async reiniciar(): Promise<void> {
    this.ids.clear();
    this.offset = 0;
    this.items.set([]);
    this.total.set(0);
    this.hasMore.set(true);
    this.finSinProgreso.set(false);
    this.fallo.set(null);
    await this.cargar();
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
    this.fallo.set(null);

    try {
      const res = await firstValueFrom(this.svc.getAnime('', this.offset));

      // Deduplica también dentro de la misma página: `track anime.id` del @for
      // rompería (NG0955) si la API repitiera un id en una sola respuesta.
      const nuevos: Anime[] = [];
      for (const anime of res.items) {
        if (!this.ids.has(anime.id)) {
          this.ids.add(anime.id);
          nuevos.push(anime);
        }
      }

      this.items.update((prev) => [...prev, ...nuevos]);
      // Avanza por lo realmente recibido: una página corta no debe saltarse títulos.
      this.offset = res.offset + res.items.length;
      if (res.total > 0) {
        this.total.set(res.total);
      }
      // Página repetida (solo duplicados) = sin progreso real: no seguir pidiendo.
      const sinProgreso = res.items.length > 0 && nuevos.length === 0;
      this.finSinProgreso.set(sinProgreso);
      this.hasMore.set(sinProgreso ? false : res.hasMore);
    } catch (motivo: unknown) {
      // El offset no avanza: el reintento pide exactamente la misma página.
      this.fallo.set(this.aFallo(motivo));
    } finally {
      this.cargando.set(false);
      this.infinite?.complete();
    }
  }

  /** Normaliza lo lanzado por el servicio; un error inesperado no deja el panel vacío. */
  private aFallo(motivo: unknown): FalloApi {
    if (typeof motivo === 'object' && motivo !== null && 'tipo' in motivo && 'status' in motivo) {
      return motivo as FalloApi;
    }
    return { tipo: 'servidor', status: 0 };
  }
}
