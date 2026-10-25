import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Anime, FalloApi, PageResult } from '../models/anime.model';

/** Subconjunto de JSON:API que consume la app (Kitsu). */
interface KitsuPoster {
  medium?: string | null;
  small?: string | null;
  original?: string | null;
}

interface KitsuAttributes {
  canonicalTitle?: string | null;
  posterImage?: KitsuPoster | null;
  startDate?: string | null;
  averageRating?: string | null;
  episodeCount?: number | null;
  subtype?: string | null;
  synopsis?: string | null;
}

interface KitsuResource {
  id: string;
  attributes?: KitsuAttributes | null;
}

interface KitsuListResponse {
  data?: KitsuResource[];
  meta?: { count?: number };
}

interface KitsuOneResponse {
  data?: KitsuResource | null;
}

/**
 * Única puerta a la API de Kitsu. La página solo pide páginas de 20 y recibe
 * un `PageResult` ya normalizado; aquí viven la URL, los parámetros y el fin real.
 */
@Injectable({ providedIn: 'root' })
export class AnimeService {
  private readonly http = inject(HttpClient);

  /** Tamaño de página acordado con el PLAN (Kitsu admite hasta 20). */
  readonly pageSize = 20;

  private readonly base = environment.apiUrl;
  private readonly fields =
    'canonicalTitle,posterImage,startDate,averageRating,episodeCount,subtype';
  /** El detalle pide además la sinopsis: el listado no la necesita y pesa. */
  private readonly fieldsDetalle = `${this.fields},synopsis`;
  private readonly headers = { Accept: 'application/vnd.api+json' };

  private static readonly TIPOS: Record<string, string> = {
    tv: 'TV',
    movie: 'Película',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Especial',
    music: 'Música',
  };

  /**
   * Página de anime. `hasMore` sale de `meta.count` (22 515 títulos reales),
   * nunca de "creo que hay más".
   */
  getAnime(query: string, offset: number): Observable<PageResult> {
    let params = new HttpParams()
      .set('page[limit]', this.pageSize)
      .set('page[offset]', offset)
      .set('fields[anime]', this.fields);

    const texto = query.trim();
    if (texto) {
      params = params.set('filter[text]', texto);
    }

    return this.http
      .get<KitsuListResponse>(this.base, { params, headers: this.headers })
      .pipe(
        map((r) => {
          const total = r.meta?.count ?? 0;
          const items = (r.data ?? []).map((d) => this.toAnime(d));
          return {
            items,
            offset,
            total,
            // Fin real: hay más solo si esta página trajo datos y queda catálogo.
            hasMore: items.length > 0 && offset + this.pageSize < total,
          };
        }),
        catchError((error: unknown) => throwError(() => this.clasificar(error))),
      );
  }

  /**
   * Un título por id (R4). Mismo `toAnime` que el listado —una sola forma de
   * normalizar— más la sinopsis, que solo tiene sentido en el detalle.
   */
  getAnimeById(id: string): Observable<Anime> {
    const params = new HttpParams().set('fields[anime]', this.fieldsDetalle);
    return this.http
      .get<KitsuOneResponse>(`${this.base}/${encodeURIComponent(id)}`, {
        params,
        headers: this.headers,
      })
      .pipe(
        map((r) => {
          if (!r.data) {
            // 200 sin recurso: se trata como "no existe" y la página muestra su aviso.
            throw { tipo: 'cliente', status: 404 } satisfies FalloApi;
          }
          return this.toAnime(r.data);
        }),
        catchError((error: unknown) =>
          throwError(() => (error instanceof HttpErrorResponse ? this.clasificar(error) : error)),
        ),
      );
  }

  /**
   * Red caída (sin respuesta) ≠ API rota (5xx/429) ≠ petición rechazada (4xx).
   * La página decide el mensaje; el contrato de `PageResult` no cambia.
   */
  private clasificar(error: unknown): FalloApi {
    if (!(error instanceof HttpErrorResponse)) {
      return { tipo: 'red', status: 0 };
    }
    if (error.status === 0) {
      return { tipo: 'red', status: 0 };
    }
    if (error.status === 429) {
      return { tipo: 'limite', status: 429 };
    }
    if (error.status >= 500) {
      return { tipo: 'servidor', status: error.status };
    }
    return { tipo: 'cliente', status: error.status };
  }

  /** JSON:API → modelo propio. */
  private toAnime(d: KitsuResource): Anime {
    const a = d.attributes ?? {};
    const poster = a.posterImage;
    const rating = Number(a.averageRating);

    return {
      id: d.id,
      titulo: a.canonicalTitle?.trim() || 'Sin título',
      portada: poster?.medium ?? poster?.small ?? poster?.original ?? '',
      anio: a.startDate ? a.startDate.slice(0, 4) : '—',
      rating: a.averageRating && Number.isFinite(rating) ? rating : null,
      episodios: a.episodeCount ?? null,
      tipo: this.toTipo(a.subtype),
      sinopsis: a.synopsis?.trim() || null,
    };
  }

  private toTipo(subtype: string | null | undefined): string {
    if (!subtype) {
      return '—';
    }
    return AnimeService.TIPOS[subtype] ?? subtype.toUpperCase();
  }
}
