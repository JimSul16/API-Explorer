/** Modelo normalizado del catálogo: la página nunca ve JSON:API. */
export interface Anime {
  id: string;
  titulo: string;
  portada: string;
  anio: string;
  rating: number | null;
  episodios: number | null;
  tipo: string;
}

/** Resultado de una página de Kitsu + fin real de la paginación. */
export interface PageResult {
  items: Anime[];
  offset: number;
  total: number;
  hasMore: boolean;
}
