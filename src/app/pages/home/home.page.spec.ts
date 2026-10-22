import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePage } from './home.page';

const URL_KITSU = 'https://kitsu.io/api/edge/anime';

interface RecursoKitsu {
  id: string;
  attributes: {
    canonicalTitle: string;
    posterImage: { medium: string };
    startDate: string;
    averageRating: string;
    episodeCount: number;
    subtype: string;
  };
}

function recurso(id: number): RecursoKitsu {
  return {
    id: String(id),
    attributes: {
      canonicalTitle: `Anime ${id}`,
      posterImage: { medium: `https://media.test/${id}.jpg` },
      startDate: '1998-04-03',
      averageRating: '82.28',
      episodeCount: 26,
      subtype: 'tv',
    },
  };
}

function pagina(ids: number[], count: number) {
  return { data: ids.map(recurso), meta: { count } };
}

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;
  let lista: HomePage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomePage);
    lista = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit dispara la primera página
  });

  afterEach(() => {
    http.verify();
  });

  it('pide la primera página con limit 20 y offset 0', async () => {
    const req = http.expectOne((r) => r.url === URL_KITSU);
    expect(req.request.params.get('page[limit]')).toBe('20');
    expect(req.request.params.get('page[offset]')).toBe('0');

    req.flush(pagina([1, 2], 22515));
    await fixture.whenStable();

    expect(lista.items().length).toBe(2);
    expect(lista.items()[0].titulo).toBe('Anime 1');
    expect(lista.items()[0].tipo).toBe('TV');
    expect(lista.total()).toBe(22515);
    expect(lista.hasMore()).toBe(true);
    expect(lista.estado()).toBe('lista');
  });

  it('concatena la página siguiente sin duplicar ids', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 40));
    await fixture.whenStable();

    const siguiente = lista.cargar();
    const req = http.expectOne((r) => r.params.get('page[offset]') === '20');
    req.flush(pagina([2, 3], 40)); // Kitsu solapa el id 2
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(lista.hasMore()).toBe(false); // 20 + 20 < 40 es falso: fin real
  });

  it('un error no pierde la lista, desbloquea la UI y reintenta el mismo offset', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 60));
    await fixture.whenStable();

    const fallo = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '20').flush('caído', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await fallo;

    expect(lista.error()).toBe(true);
    expect(lista.items().length).toBe(2);
    expect(lista.cargando()).toBe(false);
    expect(lista.estado()).toBe('lista'); // error inline, no pantalla completa

    const reintento = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '20').flush(pagina([3], 60));
    await reintento;

    expect(lista.error()).toBe(false);
    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('corta la paginación al alcanzar meta.count', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 20));
    await fixture.whenStable();

    expect(lista.hasMore()).toBe(false);
  });

  it('distingue una respuesta vacía de un error de red', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([], 0));
    await fixture.whenStable();

    expect(lista.estado()).toBe('vacio');
    expect(lista.error()).toBe(false);
  });
});
