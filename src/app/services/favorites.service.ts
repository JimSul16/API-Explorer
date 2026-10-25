import { Injectable, computed, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/** Clave local; solo se guardan ids, nunca objetos (el catálogo vive en la API). */
const CLAVE = 'favoritos';

/**
 * Favoritos locales (R6). Persiste **solo los ids** en `@capacitor/preferences`
 * (en Android: SharedPreferences; en el navegador: localStorage) y los expone
 * como `signal` para que cualquier tarjeta se entere del cambio sin recargar.
 */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly _ids = signal<readonly string[]>([]);
  /** Ids favoritos, en el orden en que se marcaron. */
  readonly ids = this._ids.asReadonly();
  readonly total = computed(() => this._ids().length);

  /** `init()` idempotente: dos llamadas seguidas no leen dos veces ni se pisan. */
  private iniciando: Promise<void> | null = null;

  /** Lee lo guardado. Seguro de llamar varias veces (arranque + página). */
  init(): Promise<void> {
    this.iniciando ??= this.leer();
    return this.iniciando;
  }

  esFavorito(id: string): boolean {
    return this._ids().includes(id);
  }

  /**
   * Marca o desmarca. Devuelve `true` si quedó marcado.
   * El signal se actualiza antes de escribir: la estrella responde al instante.
   */
  async toggle(id: string): Promise<boolean> {
    const actuales = this._ids();
    const marcado = !actuales.includes(id);
    const nuevos = marcado ? [...actuales, id] : actuales.filter((x) => x !== id);

    this._ids.set(nuevos);
    try {
      await Preferences.set({ key: CLAVE, value: JSON.stringify(nuevos) });
    } catch {
      // Si el dispositivo rechaza la escritura, se revierte **solo este id**:
      // otro toggle simultáneo que sí se guardó no se pierde por el camino.
      this._ids.update((lista) =>
        marcado ? lista.filter((x) => x !== id) : [id, ...lista],
      );
      return !marcado;
    }
    return marcado;
  }

  /** Quita un id concreto (usado por "eliminar" desde la página de favoritos). */
  async quitar(id: string): Promise<void> {
    if (this.esFavorito(id)) {
      await this.toggle(id);
    }
  }

  private async leer(): Promise<void> {
    let guardados: string[] = [];
    try {
      const { value } = await Preferences.get({ key: CLAVE });
      guardados = this.parsear(value);
    } catch {
      guardados = []; // sin lectura no hay favoritos, pero la app sigue viva
    }
    // Si mientras leíamos alguien marcó algo, no se pierde: se unen ambos lados.
    this._ids.set([...new Set([...guardados, ...this._ids()])]);
  }

  /** Lo guardado puede venir corrupto o de una versión anterior: se filtra. */
  private parsear(value: string | null): string[] {
    if (!value) {
      return [];
    }
    try {
      const crudo: unknown = JSON.parse(value);
      if (!Array.isArray(crudo)) {
        return [];
      }
      const ids = crudo.filter((x): x is string => typeof x === 'string' && x.length > 0);
      return [...new Set(ids)];
    } catch {
      return [];
    }
  }
}
