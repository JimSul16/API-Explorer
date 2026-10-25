import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
import { DetailPage } from './detail.page';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const getMock = vi.mocked(Preferences.get);
const setMock = vi.mocked(Preferences.set);
const URL_KITSU = environment.apiUrl;

interface RecursoDetalle {
  id: string;
  attributes: {
    canonicalTitle: string;
    posterImage: { medium: string } | null;
    startDate: string;
    averageRating: string | null;
    episodeCount: number | null;
    subtype: string;
    synopsis: string | null;
  };
}

function detalle(id: number, extra: Partial<RecursoDetalle['attributes']> = {}) {
  const recurso: RecursoDetalle = {
    id: String(id),
    attributes: {
      canonicalTitle: `Anime ${id}`,
      posterImage: { medium: `https://media.test/${id}.jpg` },
      startDate: '1998-04-03',
      averageRating: '82.28',
      episodeCount: 26,
      subtype: 'tv',
      synopsis: 'Una tripulación de cazarrecompensas viaja por el sistema solar.',
      ...extra,
    },
  };
  return { data: recurso };
}

describe('DetailPage', () => {
  let fixture: ComponentFixture<DetailPage>;
  let ficha: DetailPage;
  let http: HttpTestingController;

  /** Mismo helper que en home: drena los microtasks de la carga. */
  async function asentar(): Promise<void> {
    await new Promise<void>((resolver) => setTimeout(resolver));
  }

  async function abrir(id: string): Promise<void> {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await asentar();
  }

  beforeEach(async () => {
    getMock.mockReset();
    setMock.mockReset();
    getMock.mockResolvedValue({ value: null });
    setMock.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [DetailPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DetailPage);
    ficha = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('pide el detalle por id e incluye la sinopsis en los campos', async () => {
    await abrir('42');

    const req = http.expectOne((r) => r.url === `${URL_KITSU}/42`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('fields[anime]')).toContain('synopsis');
    req.flush(detalle(42));
    await asentar();

    expect(ficha.estado()).toBe('listo');
    expect(ficha.anime()?.titulo).toBe('Anime 42');
    expect(ficha.anime()?.anio).toBe('1998');
    expect(ficha.resumenCabecera()).toBe('Anime 42');
    expect(ficha.nota()).toBe('8.2');
    expect(ficha.sinopsis()).toContain('cazarrecompensas');
  });

  it('mientras espera la respuesta está en estado cargando (R5)', async () => {
    await abrir('7');
    expect(ficha.estado()).toBe('cargando');

    http.expectOne((r) => r.url === `${URL_KITSU}/7`).flush(detalle(7));
    await asentar();

    expect(ficha.estado()).toBe('listo');
    expect(ficha.cargando()).toBe(false);
  });

  it('un 404 es "no encontrado", no un error de red (R5)', async () => {
    await abrir('999');
    http
      .expectOne((r) => r.url === `${URL_KITSU}/999`)
      .flush('no existe', { status: 404, statusText: 'Not Found' });
    await asentar();

    expect(ficha.estado()).toBe('noEncontrado');
    expect(ficha.anime()).toBeNull();
    expect(ficha.cargando()).toBe(false);
  });

  it('un fallo de red muestra error y el reintento vuelve a pedir el mismo id (R5)', async () => {
    await abrir('5');
    http
      .expectOne((r) => r.url === `${URL_KITSU}/5`)
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await asentar();

    expect(ficha.estado()).toBe('error');
    expect(ficha.mensajeFallo()).toContain('Kitsu está fallando');

    ficha.reintentar();
    await asentar();

    http.expectOne((r) => r.url === `${URL_KITSU}/5`).flush(detalle(5));
    await asentar();

    expect(ficha.estado()).toBe('listo');
    expect(ficha.anime()?.id).toBe('5');
  });

  it('sin sinopsis en la respuesta muestra un texto por defecto', async () => {
    await abrir('3');
    http.expectOne((r) => r.url === `${URL_KITSU}/3`).flush(detalle(3, { synopsis: null }));
    await asentar();

    expect(ficha.sinopsis()).toContain('no tiene sinopsis');
  });

  it('recarga cuando cambia el id en la misma vista reutilizada', async () => {
    await abrir('1');
    http.expectOne((r) => r.url === `${URL_KITSU}/1`).flush(detalle(1));
    await asentar();
    expect(ficha.anime()?.id).toBe('1');

    await abrir('2');
    http.expectOne((r) => r.url === `${URL_KITSU}/2`).flush(detalle(2));
    await asentar();

    expect(ficha.anime()?.id).toBe('2');
    expect(ficha.anime()?.titulo).toBe('Anime 2');
  });

  it('un id vacío no pide nada y avisa de que no hay título', async () => {
    await abrir('');

    http.expectNone((r) => r.url.startsWith(URL_KITSU));
    expect(ficha.estado()).toBe('noEncontrado');
    expect(ficha.cargando()).toBe(false);
  });

  it('descarta la respuesta vieja si el id cambió mientras cargaba', async () => {
    await abrir('1');
    const lento = http.expectOne((r) => r.url === `${URL_KITSU}/1`);

    await abrir('2'); // el usuario ya está en otra ficha
    lento.flush(detalle(1));
    await asentar();

    http.expectOne((r) => r.url === `${URL_KITSU}/2`).flush(detalle(2));
    await asentar();

    expect(ficha.anime()?.id).toBe('2');
    expect(ficha.estado()).toBe('listo');
  });

  it('guarda y quita el favorito desde la ficha (R6)', async () => {
    await abrir('10');
    http.expectOne((r) => r.url === `${URL_KITSU}/10`).flush(detalle(10));
    await asentar();

    expect(ficha.esFavorito()).toBe(false);

    await ficha.alternarFavorito();
    expect(ficha.esFavorito()).toBe(true);
    expect(setMock).toHaveBeenCalledWith({ key: 'favoritos', value: '["10"]' });

    await ficha.alternarFavorito();
    expect(ficha.esFavorito()).toBe(false);
    expect(setMock).toHaveBeenLastCalledWith({ key: 'favoritos', value: '[]' });
  });
});
