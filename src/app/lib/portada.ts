/**
 * Detalles visuales de una portada que se comparten entre la tarjeta del
 * catálogo y la ficha del detalle (mismo monograma, mismo color por id).
 */

/** Iniciales para el monograma cuando no hay imagen (o la imagen falla). */
export function inicialesDe(titulo: string): string {
  const palabras = titulo.split(/\s+/).filter(Boolean);
  const letras = palabras.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return letras.join('') || '?';
}

/** Matiz estable por id: cada monograma tiene su color sin salir de la paleta. */
export function matizDe(id: string): number {
  let hash = 0;
  for (const c of id) {
    hash = (hash * 31 + c.charCodeAt(0)) % 360;
  }
  return hash;
}

/** Nota sobre 10 con un decimal, o raya si la API no la trae. */
export function notaDe(rating: number | null): string {
  return rating === null ? '—' : (rating / 10).toFixed(1);
}
