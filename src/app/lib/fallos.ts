import { FalloApi } from '../models/anime.model';

/**
 * Traduce el fallo que ya clasificó `AnimeService` a un mensaje para la persona.
 * Vive fuera de las páginas para que home y detalle digan exactamente lo mismo.
 */
export function mensajeDeFallo(fallo: FalloApi): string {
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
}

/** Etiqueta corta para la cabecera, alineada con el tipo de fallo. */
export function etiquetaDeFallo(fallo: FalloApi | null): string {
  switch (fallo?.tipo) {
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
}

/**
 * Normaliza lo lanzado por el servicio. Un error inesperado (no clasificado)
 * se trata como fallo de servidor para no dejar la pantalla sin explicación.
 */
export function aFallo(motivo: unknown): FalloApi {
  if (typeof motivo === 'object' && motivo !== null && 'tipo' in motivo && 'status' in motivo) {
    return motivo as FalloApi;
  }
  return { tipo: 'servidor', status: 0 };
}

/** Un 404 no es "la API se cayó": es "ese título no existe". */
export function esNoEncontrado(fallo: FalloApi | null): boolean {
  return fallo?.tipo === 'cliente' && fallo.status === 404;
}
