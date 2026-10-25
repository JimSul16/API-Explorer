import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AnimeService } from './anime.service';

const URL_KITSU = environment.apiUrl;

describe('AnimeService', () => {
  let svc: AnimeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(AnimeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('pide la página con los parámetros de Kitsu y normaliza JSON:API', async () => {
    const promesa = firstValueFrom(svc.getAnime('  naruto  ', 40));
    const req = http.expectOne((r) => r.url === URL_KITSU);

    expect(req.request.params.get('page[limit]')).toBe('20');
    expect(req.request.params.get('page[offset]')).toBe('40');
    expect(req.request.params.get('filter[text]')).toBe('naruto');
    expect(req.request.headers.get('Accept')).toBe('application/vnd.api+json');

    req.flush({
      data: [
        {
          id: '7442',
          attributes: {
            canonicalTitle: '  Naruto  ',
            posterImage: { medium: 'https://media.test/naruto.jpg' },
            startDate: '2002-10-03',
            averageRating: '75.10',
            episodeCount: 220,
            subtype: 'tv',
          },
        },
      ],
      meta: { count: 100 },
    });

    const res = await promesa;
    expect(res.offset).toBe(40);
    expect(res.total).toBe(100);
    expect(res.hasMore).toBe(true); // 40 + 20 < 100
    expect(res.items[0]).toEqual({
      id: '7442',
      titulo: 'Naruto',
      portada: 'https://media.test/naruto.jpg',
      anio: '2002',
      rating: 75.1,
      episodios: 220,
      tipo: 'TV',
      sinopsis: null, // el listado no pide sinopsis
    });
  });

  it('no pide filter[text] cuando la consulta viene vacía', async () => {
    const promesa = firstValueFrom(svc.getAnime('   ', 0));
    const req = http.expectOne((r) => r.url === URL_KITSU);

    expect(req.request.params.has('filter[text]')).toBe(false);
    req.flush({ data: [], meta: { count: 0 } });
    await promesa;
  });

  it('marca hasMore falso al llegar a meta.count y con página vacía', async () => {
    const ultima = firstValueFrom(svc.getAnime('', 80));
    http.expectOne((r) => r.url === URL_KITSU).flush({
      data: [{ id: '1', attributes: { canonicalTitle: 'Uno' } }],
      meta: { count: 100 },
    });
    expect((await ultima).hasMore).toBe(false); // 80 + 20 < 100 es falso

    const vacia = firstValueFrom(svc.getAnime('', 0));
    http
      .expectOne((r) => r.url === URL_KITSU)
      .flush({ data: [], meta: { count: 100 } });
    expect((await vacia).hasMore).toBe(false);
  });

  it('clasifica red caída, error del servidor, límite de peticiones y rechazo del cliente', async () => {
    const red = firstValueFrom(svc.getAnime('', 0));
    http
      .expectOne((r) => r.url === URL_KITSU)
      .flush('sin respuesta', { status: 0, statusText: 'Unknown Error' });
    await expect(red).rejects.toMatchObject({ tipo: 'red', status: 0 });

    const servidor = firstValueFrom(svc.getAnime('', 0));
    http
      .expectOne((r) => r.url === URL_KITSU)
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await expect(servidor).rejects.toMatchObject({ tipo: 'servidor', status: 503 });

    const limite = firstValueFrom(svc.getAnime('', 0));
    http
      .expectOne((r) => r.url === URL_KITSU)
      .flush('demasiadas', { status: 429, statusText: 'Too Many Requests' });
    await expect(limite).rejects.toMatchObject({ tipo: 'limite', status: 429 });

    const cliente = firstValueFrom(svc.getAnime('', 0));
    http
      .expectOne((r) => r.url === URL_KITSU)
      .flush('no existe', { status: 404, statusText: 'Not Found' });
    await expect(cliente).rejects.toMatchObject({ tipo: 'cliente', status: 404 });
  });

  it('getAnimeById pide el recurso con sinopsis y reutiliza la normalización', async () => {
    const promesa = firstValueFrom(svc.getAnimeById('42'));
    const req = http.expectOne((r) => r.url === `${URL_KITSU}/42`);

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('fields[anime]')).toContain('synopsis');
    expect(req.request.params.has('page[limit]')).toBe(false); // es una ficha, no una página

    req.flush({
      data: {
        id: '42',
        attributes: {
          canonicalTitle: '  Cowboy Bebop  ',
          posterImage: { medium: 'https://media.test/bebop.jpg' },
          startDate: '1998-04-03',
          averageRating: '82.28',
          episodeCount: 26,
          subtype: 'tv',
          synopsis: '  Cazarrecompensas en el espacio.  ',
        },
      },
    });

    expect(await promesa).toEqual({
      id: '42',
      titulo: 'Cowboy Bebop',
      portada: 'https://media.test/bebop.jpg',
      anio: '1998',
      rating: 82.28,
      episodios: 26,
      tipo: 'TV',
      sinopsis: 'Cazarrecompensas en el espacio.',
    });
  });

  it('getAnimeById trata el 404 y el 200 sin recurso como "no existe"', async () => {
    const noExiste = firstValueFrom(svc.getAnimeById('999'));
    http
      .expectOne((r) => r.url === `${URL_KITSU}/999`)
      .flush('no existe', { status: 404, statusText: 'Not Found' });
    await expect(noExiste).rejects.toMatchObject({ tipo: 'cliente', status: 404 });

    const sinRecurso = firstValueFrom(svc.getAnimeById('1000'));
    http.expectOne((r) => r.url === `${URL_KITSU}/1000`).flush({ data: null });
    await expect(sinRecurso).rejects.toMatchObject({ tipo: 'cliente', status: 404 });
  });

  it('getAnimeById clasifica la red caída igual que el listado', async () => {
    const red = firstValueFrom(svc.getAnimeById('1'));
    http
      .expectOne((r) => r.url === `${URL_KITSU}/1`)
      .flush('sin respuesta', { status: 0, statusText: 'Unknown Error' });
    await expect(red).rejects.toMatchObject({ tipo: 'red', status: 0 });
  });
});
