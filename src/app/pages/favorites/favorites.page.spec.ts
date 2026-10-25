import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { FavoritesService } from '../../services/favorites.service';
import { FavoritesPage } from './favorites.page';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const getMock = vi.mocked(Preferences.get);
const setMock = vi.mocked(Preferences.set);
const URL_KITSU = environment.apiUrl;

function detalle(id: number) {
  return {
    data: {
      id: String(id),
      attributes: {
        canonicalTitle: `Anime ${id}`,
        posterImage: { medium: `https://media.test/${id}.jpg` },
        startDate: '1998-04-03',
        averageRating: '82.28',
        episodeCount: 26,
        subtype: 'tv',
        synopsis: 'Sinopsis',
      },
    },
  };
}

describe('FavoritesPage', () => {
  let fixture: ComponentFixture<FavoritesPage>;
  let pagina: FavoritesPage;
  let http: HttpTestingController;
  let favs: FavoritesService;

  async function asentar(): Promise<void> {
    await new Promise<void>((resolver) => setTimeout(resolver));
  }

  async function abrir(guardados: string | null): Promise<void> {
    getMock.mockResolvedValue({ value: guardados });
    fixture = TestBed.createComponent(FavoritesPage);
    pagina = fixture.componentInstance;
    fixture.detectChanges(); // ngOnInit pide las fichas guardadas
    await asentar();
  }

  beforeEach(async () => {
    getMock.mockReset();
    setMock.mockReset();
    getMock.mockResolvedValue({ value: null });
    setMock.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [FavoritesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    favs = TestBed.inject(FavoritesService);
  });

  afterEach(() => {
    http.verify();
  });

  it('pide a la API la ficha de cada id guardado y las muestra', async () => {
    await abrir('["1","2"]');

    expect(pagina.estado()).toBe('cargando');

    http.expectOne((r) => r.url === `${URL_KITSU}/1`).flush(detalle(1));
    await asentar();
    http.expectOne((r) => r.url === `${URL_KITSU}/2`).flush(detalle(2));
    await asentar();

    expect(pagina.estado()).toBe('lista');
    expect(pagina.items().map((a) => a.id)).toEqual(['1', '2']);
    expect(pagina.total()).toBe(2);
  });

  it('sin ids guardados muestra el vacío y no llama a la API', async () => {
    await abrir(null);

    http.expectNone((r) => r.url.startsWith(URL_KITSU));
    expect(pagina.estado()).toBe('vacio');
    expect(pagina.items()).toEqual([]);
  });

  it('si la API falla con todos, muestra error y el reintento vuelve a pedir', async () => {
    await abrir('["9"]');
    http
      .expectOne((r) => r.url === `${URL_KITSU}/9`)
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await asentar();

    expect(pagina.estado()).toBe('error');
    expect(pagina.fallidos()).toBe(1);

    const reintento = pagina.reintentar();
    await asentar();
    http.expectOne((r) => r.url === `${URL_KITSU}/9`).flush(detalle(9));
    await reintento;
    await asentar();

    expect(pagina.estado()).toBe('lista');
    expect(pagina.items().map((a) => a.id)).toEqual(['9']);
    expect(pagina.fallidos()).toBe(0);
  });

  it('si solo falla una, avisa y conserva las demás', async () => {
    await abrir('["1","9"]');

    http.expectOne((r) => r.url === `${URL_KITSU}/1`).flush(detalle(1));
    await asentar();
    http
      .expectOne((r) => r.url === `${URL_KITSU}/9`)
      .flush('caído', { status: 500, statusText: 'Server Error' });
    await asentar();

    expect(pagina.estado()).toBe('lista');
    expect(pagina.items().map((a) => a.id)).toEqual(['1']);
    expect(pagina.fallidos()).toBe(1);
  });

  it('quitar un favorito lo saca de la lista y de Preferences', async () => {
    await abrir('["1"]');
    http.expectOne((r) => r.url === `${URL_KITSU}/1`).flush(detalle(1));
    await asentar();
    expect(pagina.items().length).toBe(1);

    await pagina.quitar('1');
    fixture.detectChanges();

    expect(pagina.items()).toEqual([]);
    expect(favs.ids()).toEqual([]);
    expect(pagina.estado()).toBe('vacio');
    expect(setMock).toHaveBeenLastCalledWith({ key: 'favoritos', value: '[]' });
  });
});
