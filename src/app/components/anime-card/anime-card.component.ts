import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { Anime } from '../../models/anime.model';

/**
 * Tarjeta de catálogo: portada 2:3 (con monograma si la imagen falla),
 * título, año · tipo · episodios y nota. Sin dependencias de la página.
 */
@Component({
  selector: 'app-anime-card',
  templateUrl: './anime-card.component.html',
  styleUrls: ['./anime-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon],
})
export class AnimeCardComponent {
  readonly anime = input.required<Anime>();

  protected readonly portadaRota = signal(false);

  protected readonly verPortada = computed(
    () => this.anime().portada.length > 0 && !this.portadaRota(),
  );

  protected readonly iniciales = computed(() => {
    const palabras = this.anime().titulo.split(/\s+/).filter(Boolean);
    const letras = palabras.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
    return letras.join('') || '?';
  });

  /** Matiz estable por id: cada monograma tiene su color, sin salir de la paleta. */
  protected readonly matiz = computed(() => {
    let hash = 0;
    for (const c of this.anime().id) {
      hash = (hash * 31 + c.charCodeAt(0)) % 360;
    }
    return hash;
  });

  protected readonly nota = computed(() => {
    const rating = this.anime().rating;
    return rating === null ? '—' : (rating / 10).toFixed(1);
  });
}
