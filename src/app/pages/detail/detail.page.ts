import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';

import { PanelEstadoComponent } from '../../components/panel-estado/panel-estado.component';
import { aFallo, esNoEncontrado, etiquetaDeFallo, mensajeDeFallo } from '../../lib/fallos';
import { inicialesDe, matizDe, notaDe } from '../../lib/portada';
import { Anime, FalloApi } from '../../models/anime.model';
import { AnimeService } from '../../services/anime.service';
import { FavoritesService } from '../../services/favorites.service';

type EstadoDetalle = 'cargando' | 'error' | 'noEncontrado' | 'listo';

/**
 * Ficha de un título (R4) con sus tres estados (R5): cargando, no encontrado y
 * error de red con reintento. El `id` llega por la ruta gracias a
 * `withComponentInputBinding()`; si cambia (misma vista reutilizada) se recarga.
 */
@Component({
  selector: 'app-detail',
  templateUrl: './detail.page.html',
  styleUrls: ['./detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    IonSkeletonText,
    PanelEstadoComponent,
  ],
})
export class DetailPage {
  private readonly svc = inject(AnimeService);
  private readonly router = inject(Router);
  private readonly favoritos = inject(FavoritesService);

  /** `anime/:id` — lo inyecta el router como input del componente. */
  readonly id = input('');

  readonly anime = signal<Anime | null>(null);
  readonly cargando = signal(true);
  readonly fallo = signal<FalloApi | null>(null);

  /** Último id pedido: evita recargar si el input se vuelve a asignar igual. */
  private pedido: string | null = null;
  private generacion = 0;

  constructor() {
    // `effect` y no `ngOnInit`: al navegar de un detalle a otro la misma vista se
    // reutiliza y el id cambia sin destruir el componente.
    effect(() => {
      const id = this.id().trim();
      if (id === this.pedido) {
        return;
      }
      this.pedido = id;
      if (!id) {
        this.cargando.set(false); // ruta sin id: se resuelve como "no encontrado"
        this.anime.set(null);
        this.fallo.set(null);
        return;
      }
      // Ficha nueva: nada de la anterior debe quedar en pantalla.
      this.portadaRota.set(false);
      this.anime.set(null);
      this.cargando.set(true);
      this.fallo.set(null);
      void this.cargar(id);
    });
  }

  readonly estado = computed<EstadoDetalle>(() => {
    if (this.cargando()) {
      return 'cargando';
    }
    if (esNoEncontrado(this.fallo())) {
      return 'noEncontrado';
    }
    if (this.fallo()) {
      return 'error';
    }
    return this.anime() ? 'listo' : 'noEncontrado';
  });

  /** Texto de la cabecera: nunca contradice al estado visible. */
  readonly resumenCabecera = computed(() => {
    const anime = this.anime();
    if (anime) {
      return anime.titulo;
    }
    if (esNoEncontrado(this.fallo())) {
      return 'Título no encontrado';
    }
    return this.fallo() ? etiquetaDeFallo(this.fallo()) : 'Detalle';
  });

  readonly mensajeFallo = computed(() => {
    const fallo = this.fallo();
    return fallo ? mensajeDeFallo(fallo) : '';
  });

  readonly sinopsis = computed(() => {
    const texto = this.anime()?.sinopsis;
    return texto && texto.length > 0 ? texto : 'Kitsu no tiene sinopsis de este título.';
  });

  readonly nota = computed(() => notaDe(this.anime()?.rating ?? null));

  readonly iniciales = computed(() => inicialesDe(this.anime()?.titulo ?? ''));
  readonly matiz = computed(() => matizDe(this.anime()?.id ?? ''));

  readonly portadaRota = signal(false);
  readonly verPortada = computed(
    () => (this.anime()?.portada.length ?? 0) > 0 && !this.portadaRota(),
  );

  /** Reintento explícito de la misma ficha (sin id válido no se pide nada). */
  reintentar(): void {
    const id = this.id().trim();
    if (id) {
      this.portadaRota.set(false);
      void this.cargar(id);
    }
  }

  /** Estrella de la ficha (R6): el servicio persiste solo el id. */
  readonly esFavorito = computed(() => {
    const anime = this.anime();
    return anime !== null && this.favoritos.ids().includes(anime.id);
  });

  async alternarFavorito(): Promise<void> {
    const anime = this.anime();
    if (anime) {
      await this.favoritos.toggle(anime.id);
    }
  }

  /** Acción del estado "no encontrado": volver al catálogo sin apilar otra vista. */
  irAlCatalogo(): void {
    void this.router.navigateByUrl('/home');
  }

  private async cargar(id: string): Promise<void> {
    const gen = ++this.generacion;
    this.cargando.set(true);
    this.fallo.set(null);

    try {
      const anime = await firstValueFrom(this.svc.getAnimeById(id));
      if (gen !== this.generacion) {
        return; // llegó otro id mientras respondía: no se pisa la ficha nueva
      }
      this.anime.set(anime);
    } catch (motivo: unknown) {
      if (gen !== this.generacion) {
        return;
      }
      this.anime.set(null);
      this.fallo.set(aFallo(motivo));
    } finally {
      if (gen === this.generacion) {
        this.cargando.set(false);
      }
    }
  }
}
