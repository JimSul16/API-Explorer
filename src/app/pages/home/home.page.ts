import { ChangeDetectionStrategy, Component, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnimeCardComponent } from '../../components/anime-card/anime-card.component';
import { PanelEstadoComponent } from '../../components/panel-estado/panel-estado.component';
import { aFallo, etiquetaDeFallo, mensajeDeFallo } from '../../lib/fallos';
import { Anime, FalloApi } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { FavoritesService } from '../../services/favorites.service';

type EstadoLista = 'cargando' | 'error' | 'vacio' | 'lista';

/** Lo que entrega `ionInput` de `ion-searchbar`. */
type EventoBusqueda = CustomEvent<{ value?: string | null }>;

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
    IonIcon,
    IonSearchbar,
    IonSkeletonText,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    AnimeCardComponent,
    PanelEstadoComponent,
    RouterLink,
  ],
})
export class HomePage implements OnInit {
  private readonly svc = inject(AnimeService);
  private readonly favoritos = inject(FavoritesService);

  /** Lista acumulada: se concatena, nunca se reemplaza al paginar. */
  readonly items = signal<Anime[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(false);
  readonly hasMore = signal(true);
  /** El fin no vino de `meta.count` sino de una página sin títulos nuevos. */
  readonly finSinProgreso = signal(false);
  /** Texto activo de la búsqueda (R3). Vacío = catálogo completo. */
  readonly query = signal('');

  /**
   * Último fallo clasificado. Su presencia **pausa el scroll automático**
   * (`[disabled]` del infinite scroll): así un fallo persistente no encadena
   * peticiones al esconderse el spinner; el reintento lo decide el usuario.
   */
  readonly fallo = signal<FalloApi | null>(null);
  readonly error = computed(() => this.fallo() !== null);

  @ViewChild(IonInfiniteScroll) private infinite?: IonInfiniteScroll;
  @ViewChild(IonSearchbar) private barra?: IonSearchbar;
  @ViewChild(IonContent) private contenido?: IonContent;

  /** Ids ya mostrados: la API puede solapar páginas y aquí se corta el duplicado. */
  private readonly ids = new Set<string>();
  private offset = 0;
  /** Token de generación: al cambiar la búsqueda, las respuestas viejas se descartan. */
  private generacion = 0;
  /** Petición en vuelo: `reiniciar()` la espera para no dejar mudo el scroll. */
  private enVuelo: Promise<void> | null = null;
  /** Entre pedir el reinicio y vaciar la lista: la cabecera no debe mentir. */
  private readonly reiniciando = signal(false);

  readonly buscando = computed(() => this.query().length > 0);
  readonly totalTexto = computed(() => this.total().toLocaleString('es-EC'));

  /** Favoritos en un `Set` para que la lista reaccione al tocar una estrella (R6). */
  protected readonly idsFavoritos = computed(() => new Set(this.favoritos.ids()));

  /** Causa del fallo en lenguaje humano (la del panel y la del aviso inline). */
  readonly mensajeFallo = computed(() => {
    const fallo = this.fallo();
    return fallo ? mensajeDeFallo(fallo) : '';
  });

  /** Etiqueta corta para la cabecera, alineada con el tipo de fallo. */
  private readonly etiquetaFallo = computed(() => etiquetaDeFallo(this.fallo()));

  /** Texto de cabecera que nunca contradice al estado visible. */
  readonly resumen = computed(() => {
    // Mientras se prepara el reinicio aún hay títulos viejos en pantalla: no se
    // muestran sus cifras junto a la consulta nueva.
    if (this.reiniciando()) {
      return this.buscando() ? `Buscando «${this.query()}»…` : 'Volviendo al catálogo completo…';
    }
    const cargados = this.items().length;
    if (cargados > 0) {
      if (this.buscando()) {
        return this.total() > 0
          ? `«${this.query()}» · ${this.totalTexto()} coincidencias · ${cargados} cargados`
          : `«${this.query()}» · ${cargados} cargados`;
      }
      return this.total() > 0
        ? `${this.totalTexto()} títulos · cargados ${cargados}`
        : `Cargados ${cargados} títulos`;
    }
    if (this.estado() === 'error') {
      return this.etiquetaFallo();
    }
    if (this.estado() === 'vacio') {
      return this.buscando() ? `Sin coincidencias para «${this.query()}»` : 'La API no devolvió títulos';
    }
    return this.buscando() ? `Buscando «${this.query()}»…` : 'Conectando con Kitsu…';
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

  readonly tituloVacio = computed(() =>
    this.buscando() ? `Sin resultados para «${this.query()}»` : 'La API no devolvió títulos',
  );

  readonly mensajeVacio = computed(() =>
    this.buscando()
      ? 'Kitsu no tiene títulos que coincidan con ese texto. Prueba con otro nombre o vuelve al catálogo completo.'
      : 'La respuesta vino sin datos. Vuelve a pedir el catálogo.',
  );

  readonly accionVacio = computed(() => (this.buscando() ? 'Ver catálogo completo' : 'Reintentar'));

  ngOnInit(): void {
    void this.cargar();
  }

  /** `ionInput` del searchbar (ya debounced 400 ms por Ionic). */
  buscar(evento: EventoBusqueda): void {
    void this.reiniciar(evento.detail.value ?? '');
  }

  /** Vacía el buscador y vuelve al catálogo completo. */
  async limpiar(): Promise<void> {
    if (this.barra) {
      this.barra.value = '';
    }
    await this.reiniciar('');
  }

  /**
   * Reinicio total (R3): lista, ids, offset, fin y fallo vuelven a cero y se
   * recarga con la nueva consulta. Antes espera la petición en vuelo: vaciar
   * la lista con una carga de scroll a medias deja el infinite scroll mudo
   * (Ionic pone `isLoading=false` sin resetear `didFire`).
   */
  async reiniciar(query = this.query()): Promise<void> {
    const texto = query.trim();
    const gen = ++this.generacion;
    this.query.set(texto);
    this.reiniciando.set(true);

    const enVuelo = this.enVuelo;
    if (enVuelo) {
      await enVuelo;
    }
    if (gen !== this.generacion) {
      return; // llegó otra búsqueda más nueva mientras esperábamos
    }

    this.cargando.set(false); // la petición que esperábamos ya cerró su ciclo
    this.ids.clear();
    this.offset = 0;
    this.items.set([]);
    this.total.set(0);
    this.hasMore.set(true);
    this.finSinProgreso.set(false);
    this.fallo.set(null);
    this.reiniciando.set(false);

    void this.contenido?.scrollToTop().catch(() => undefined);
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

    const gen = this.generacion;
    this.cargando.set(true);
    this.fallo.set(null);

    const peticion = this.pedirPagina(gen);
    this.enVuelo = peticion;
    try {
      await peticion;
    } finally {
      if (this.enVuelo === peticion) {
        this.enVuelo = null;
      }
    }
  }

  /**
   * Petición + aplicación del resultado + cierre del spinner, todo en la misma
   * continuación de la respuesta: `cargando` nunca queda desfasado de la lista.
   */
  private async pedirPagina(gen: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.svc.getAnime(this.query(), this.offset));
      if (gen !== this.generacion) {
        return; // respuesta vieja: no pisa la búsqueda nueva
      }

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
      if (gen !== this.generacion) {
        return; // el fallo de una búsqueda anterior no ensucia la actual
      }
      // El offset no avanza: el reintento pide exactamente la misma página.
      this.fallo.set(aFallo(motivo));
    } finally {
      if (gen === this.generacion) {
        this.cargando.set(false);
        this.infinite?.complete();
      }
    }
  }

  /** Acción del estado vacío: limpiar la búsqueda o reintentar el catálogo. */
  async accionVacioClick(): Promise<void> {
    if (this.buscando()) {
      await this.limpiar();
      return;
    }
    await this.reiniciar();
  }

  /** Estrella de la tarjeta (R6): delega en el servicio, que persiste los ids. */
  async alternarFavorito(id: string): Promise<void> {
    await this.favoritos.toggle(id);
  }
}
