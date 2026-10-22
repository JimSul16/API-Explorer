import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IonInfiniteScroll } from '@ionic/angular';

import { environment } from '../../../environments/environment';
import { HomePage } from './home.page';

const URL_KITSU = environment.apiUrl;

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

  /** El atributo real del componente: ahí aterriza el binding [disabled]. */
  function scroll(): HTMLIonInfiniteScrollElement {
    return fixture.debugElement.query(By.directive(IonInfiniteScroll))
      .nativeElement as HTMLIonInfiniteScrollElement;
  }

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
    const req = http.expectOne((r) => r.params.get('page[offset]') === '2');
    req.flush(pagina([2, 3], 40)); // Kitsu solapa el id 2
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(lista.hasMore()).toBe(true); // todavía quedan títulos en el catálogo
  });

  it('un error no pierde la lista, desbloquea la UI y reintenta el mismo offset', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 60));
    await fixture.whenStable();

    const fallo = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush('caído', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await fallo;

    expect(lista.error()).toBe(true);
    expect(lista.items().length).toBe(2);
    expect(lista.cargando()).toBe(false);
    expect(lista.estado()).toBe('lista'); // error inline, no pantalla completa

    const reintento = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([3], 60));
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

  it('una página vacía corta la paginación en vez de repetir peticiones', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await fixture.whenStable();

    const vacia = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([], 100));
    await vacia;

    expect(lista.hasMore()).toBe(false);
    expect(lista.items().length).toBe(2);
  });

  it('no lanza dos peticiones simultáneas', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await fixture.whenStable();

    const primera = lista.cargar();
    const segunda = lista.cargar(); // el guard la descarta
    const peticiones = http.match((r) => r.params.get('page[offset]') === '2');

    expect(peticiones.length).toBe(1);
    peticiones[0].flush(pagina([3], 100));
    await Promise.all([primera, segunda]);

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('completa el infinite scroll aunque la página falle', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1], 100));
    await fixture.whenStable();

    let completados = 0;
    (lista as unknown as { infinite?: unknown }).infinite = {
      complete: () => {
        completados += 1;
      },
    };

    const fallo = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '1')
      .flush('caído', { status: 500, statusText: 'Server Error' });
    await fallo;

    expect(completados).toBe(1);
    expect(lista.cargando()).toBe(false);
  });

  it('avanza el offset con lo realmente recibido: una página corta no salta títulos', async () => {
    // Página corta que NO es el final: la API puede devolver menos de 20.
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2, 3], 100));
    await fixture.whenStable();
    expect(lista.hasMore()).toBe(true);

    const siguiente = lista.cargar();
    const req = http.expectOne((r) => r.params.get('page[offset]') === '3');

    expect(req.request.params.get('page[offset]')).not.toBe('20');
    req.flush(pagina([4], 100));
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3', '4']);
  });

  it('deja el scroll disponible tras un error y lo deshabilita al agotar', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(scroll().disabled).toBe(false);

    const fallo = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await fallo;
    fixture.detectChanges();

    expect(lista.error()).toBe(true);
    expect(scroll().disabled).toBe(false); // se puede reintentar scrolleando

    const fin = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([3], 20));
    await fin;
    fixture.detectChanges();

    expect(lista.hasMore()).toBe(false);
    expect(scroll().disabled).toBe(true);
  });

  it('explica distinto una red caída que un error del servidor', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await fixture.whenStable();

    const sinRed = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('sin respuesta', { status: 0, statusText: 'Unknown Error' });
    await sinRed;

    expect(lista.fallo()?.tipo).toBe('red');
    expect(lista.mensajeFallo()).toContain('No hay conexión');

    const servidor = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await servidor;

    expect(lista.fallo()?.tipo).toBe('servidor');
    expect(lista.mensajeFallo()).toContain('Kitsu está fallando');
  });
});
