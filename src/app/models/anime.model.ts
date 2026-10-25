/** Modelo normalizado del catálogo: la página nunca ve JSON:API. */
export interface Anime {
  id: string;
  titulo: string;
  portada: string;
  anio: string;
  rating: number | null;
  episodios: number | null;
  tipo: string;
  /** Solo llega en el detalle (`getAnimeById`); en el listado va `null`. */
  sinopsis: string | null;
}

/** Resultado de una página de Kitsu + fin real de la paginación. */
export interface PageResult {
  items: Anime[];
  offset: number;
  total: number;
  hasMore: boolean;
}

/**
 * Fallo ya clasificado por el servicio, para que la UI elija el mensaje
 * sin mirar códigos HTTP ni romper el contrato de `PageResult`.
 */
export type FalloApiTipo = 'red' | 'servidor' | 'cliente' | 'limite' | 'desconocido';

export interface FalloApi {
  tipo: FalloApiTipo;
  /** Código HTTP; 0 cuando ni siquiera hubo respuesta (red caída). */
  status: number;
}
