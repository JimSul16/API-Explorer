import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { inicialesDe, matizDe, notaDe } from '../../lib/portada';
import { Anime } from '../../models/anime.model';

/**
 * Tarjeta de catálogo: portada 2:3 (con monograma si la imagen falla),
 * título, año · tipo · episodios y nota. Sin dependencias de la página: el
 * favorito entra por `input` y sale por `output` (quien la usa decide qué es).
 */
@Component({
  selector: 'app-anime-card',
  templateUrl: './anime-card.component.html',
  styleUrls: ['./anime-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, RouterLink],
})
export class AnimeCardComponent {
  readonly anime = input.required<Anime>();
  /** Estado del favorito (R6): lo pinta la tarjeta, lo guarda el servicio. */
  readonly favorito = input(false);
  readonly favoritoClick = output<string>();

  protected readonly portadaRota = signal(false);

  protected readonly verPortada = computed(
    () => this.anime().portada.length > 0 && !this.portadaRota(),
  );

  protected readonly iniciales = computed(() => inicialesDe(this.anime().titulo));

  /** Matiz estable por id: cada monograma tiene su color, sin salir de la paleta. */
  protected readonly matiz = computed(() => matizDe(this.anime().id));

  protected readonly nota = computed(() => notaDe(this.anime().rating));
}
