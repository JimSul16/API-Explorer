import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { IonInfiniteScroll, IonSearchbar } from '@ionic/angular';

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

  /**
   * Deja correr por completo la carga que dispara `ngOnInit` (que no devuelve
   * promesa). `whenStable()` solo avanzaba un microtask: la petición quedaba
   * "en vuelo" para el componente y `reiniciar()` la esperaba antes de pedir.
   */
  async function asentar(): Promise<void> {
    await new Promise<void>((resolver) => setTimeout(resolver));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
    await asentar();

    expect(lista.items().length).toBe(2);
    expect(lista.items()[0].titulo).toBe('Anime 1');
    expect(lista.items()[0].tipo).toBe('TV');
    expect(lista.total()).toBe(22515);
    expect(lista.hasMore()).toBe(true);
    expect(lista.estado()).toBe('lista');
  });

  it('concatena la página siguiente sin duplicar ids', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 40));
    await asentar();

    const siguiente = lista.cargar();
    const req = http.expectOne((r) => r.params.get('page[offset]') === '2');
    req.flush(pagina([2, 3], 40)); // Kitsu solapa el id 2
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(lista.hasMore()).toBe(true); // todavía quedan títulos en el catálogo
  });

  it('deduplica también dentro de la misma página (protege el track del @for)', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 1, 2], 100));
    await asentar();

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2']);
  });

  it('un error no pierde la lista, desbloquea la UI y reintenta el mismo offset', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 60));
    await asentar();

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

  it('corta la paginación y deshabilita el scroll al alcanzar meta.count', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 20));
    await asentar();
    fixture.detectChanges();

    expect(lista.hasMore()).toBe(false);
    expect(lista.finSinProgreso()).toBe(false); // fin real por meta.count
    expect(scroll().disabled).toBe(true);
  });

  it('distingue una respuesta vacía de un error de red', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([], 0));
    await asentar();

    expect(lista.estado()).toBe('vacio');
    expect(lista.error()).toBe(false);
  });

  it('una página vacía corta la paginación en vez de repetir peticiones', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

    const vacia = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([], 100));
    await vacia;

    expect(lista.hasMore()).toBe(false);
    expect(lista.items().length).toBe(2);
  });

  it('no lanza dos peticiones simultáneas', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

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
    await asentar();

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
    await asentar();
    expect(lista.hasMore()).toBe(true);

    const siguiente = lista.cargar();
    const req = http.expectOne((r) => r.params.get('page[offset]') === '3');

    req.flush(pagina([4], 100));
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['1', '2', '3', '4']);
  });

  it('se detiene si la API repite una página (sin progreso real)', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

    const repetida = lista.cargar();
    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([1, 2], 100));
    await repetida;

    expect(lista.items().length).toBe(2); // no crece
    expect(lista.hasMore()).toBe(false); // y no encadena más peticiones
    expect(lista.finSinProgreso()).toBe(true); // el fin no vino de meta.count
  });

  it('pausa el scroll tras un error (sin bucle) y lo rehabilita al reintentar', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();
    fixture.detectChanges();
    expect(scroll().disabled).toBe(false);

    const fallo = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await fallo;
    fixture.detectChanges();

    expect(lista.error()).toBe(true);
    expect(scroll().disabled).toBe(true); // sin reintentos automáticos en bucle

    const reintento = lista.cargar(); // el botón inline limpia el fallo
    fixture.detectChanges();
    expect(scroll().disabled).toBe(false);

    http.expectOne((r) => r.params.get('page[offset]') === '2').flush(pagina([3], 100));
    await reintento;

    expect(lista.error()).toBe(false);
    expect(lista.items().length).toBe(3);
    expect(scroll().disabled).toBe(false); // y no queda un reintento encadenado
    expect(lista.cargando()).toBe(false);
  });

  it('explica distinto una red caída que un error del servidor', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

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

    const limite = lista.cargar();
    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('demasiadas', { status: 429, statusText: 'Too Many Requests' });
    await limite;

    expect(lista.fallo()?.tipo).toBe('limite');
    expect(lista.mensajeFallo()).toContain('Demasiadas peticiones');
  });

  // ---- R3: búsqueda con reinicio total y respuestas fuera de orden ----

  it('al buscar reinicia items, offset e ids (no mezcla catálogo y resultados)', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

    const busqueda = lista.reiniciar('naruto');
    const req = http.expectOne((r) => r.params.get('filter[text]') === 'naruto');
    expect(req.request.params.get('page[offset]')).toBe('0');
    // El id 2 ya estaba en el catálogo: solo aparece si el Set se limpió al reiniciar.
    req.flush(pagina([2, 3], 2));
    await busqueda;

    expect(lista.query()).toBe('naruto');
    expect(lista.buscando()).toBe(true);
    expect(lista.items().map((a) => a.id)).toEqual(['2', '3']);
    expect(lista.total()).toBe(2);
    expect(lista.hasMore()).toBe(false);
    expect(lista.estado()).toBe('lista');
  });

  it('descarta la respuesta vieja de una carga en vuelo al buscar (y deja el scroll vivo)', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

    const cargaScroll = lista.cargar(); // petición de scroll (generación anterior) sin responder
    const busqueda = lista.reiniciar('naruto'); // espera a que esa petición cierre

    http
      .expectOne((r) => r.params.get('page[offset]') === '2')
      .flush('caído', { status: 503, statusText: 'Service Unavailable' });
    await cargaScroll; // la búsqueda ya lanzó su propia petición
    await asentar();

    const nueva = http.expectOne((r) => r.params.get('filter[text]') === 'naruto');
    expect(nueva.request.params.get('page[offset]')).toBe('0');
    nueva.flush(pagina([7], 1));
    await busqueda;
    fixture.detectChanges();

    // El 503 de la generación anterior no ensucia la búsqueda nueva.
    expect(lista.error()).toBe(false);
    expect(lista.fallo()).toBeNull();
    expect(lista.items().map((a) => a.id)).toEqual(['7']);
    expect(lista.cargando()).toBe(false);
    // La carga vieja no vació la lista con el spinner activo: el scroll sigue utilizable.
    expect(lista.hasMore()).toBe(false);
    expect(scroll().disabled).toBe(true); // fin real por meta.count = 1
  });

  it('solo la última búsqueda pinta resultados', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1], 100));
    await asentar();

    const primera = lista.reiniciar('naruto');
    const segunda = lista.reiniciar('bleach'); // llega mientras naruto está en vuelo

    http.expectOne((r) => r.params.get('filter[text]') === 'naruto').flush(pagina([1, 2], 5));
    await primera;
    await asentar();

    const bleach = http.expectOne((r) => r.params.get('filter[text]') === 'bleach');
    bleach.flush(pagina([9], 1));
    await segunda;

    expect(lista.query()).toBe('bleach');
    expect(lista.items().map((a) => a.id)).toEqual(['9']);
    expect(lista.total()).toBe(1);
  });

  it('una búsqueda sin coincidencias es vacío, no error', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1], 100));
    await asentar();

    const busqueda = lista.reiniciar('zzzz');
    http.expectOne((r) => r.params.get('filter[text]') === 'zzzz').flush(pagina([], 0));
    await busqueda;

    expect(lista.estado()).toBe('vacio');
    expect(lista.error()).toBe(false);
    expect(lista.tituloVacio()).toContain('zzzz');
    expect(lista.accionVacio()).toBe('Ver catálogo completo');
    expect(lista.resumen()).toContain('Sin coincidencias');
  });

  it('pagina después de buscar sin mezclar el catálogo anterior', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1, 2], 100));
    await asentar();

    const busqueda = lista.reiniciar('naruto');
    http.expectOne((r) => r.params.get('filter[text]') === 'naruto').flush(pagina([7, 8], 40));
    await busqueda;

    const siguiente = lista.cargar();
    const req = http.expectOne((r) => r.params.get('page[offset]') === '2');
    expect(req.request.params.get('filter[text]')).toBe('naruto');
    req.flush(pagina([9], 40));
    await siguiente;

    expect(lista.items().map((a) => a.id)).toEqual(['7', '8', '9']);
    expect(lista.hasMore()).toBe(true);
  });

  it('el buscador usa debounce 400 y el handler recorta espacios', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1], 100));
    await asentar();

    const barra = fixture.debugElement.query(By.directive(IonSearchbar))
      .nativeElement as HTMLIonSearchbarElement;
    expect(barra.debounce).toBe(400);

    lista.buscar(new CustomEvent('ionInput', { detail: { value: '  naruto  ' } }));
    const req = http.expectOne((r) => r.params.get('filter[text]') === 'naruto');
    req.flush(pagina([2], 1));
    await asentar();

    expect(lista.query()).toBe('naruto');
    expect(lista.items().map((a) => a.id)).toEqual(['2']);
  });

  it('limpiar() vacía el buscador y vuelve al catálogo completo', async () => {
    http.expectOne((r) => r.url === URL_KITSU).flush(pagina([1], 100));
    await asentar();

    const busqueda = lista.reiniciar('naruto');
    http.expectOne((r) => r.params.get('filter[text]') === 'naruto').flush(pagina([2], 1));
    await busqueda;

    const limpiar = lista.limpiar();
    const req = http.expectOne((r) => r.url === URL_KITSU && !r.params.has('filter[text]'));
    expect(req.request.params.get('page[offset]')).toBe('0');
    req.flush(pagina([1, 2], 100));
    await limpiar;

    expect(lista.query()).toBe('');
    expect(lista.buscando()).toBe(false);
    expect(lista.items().map((a) => a.id)).toEqual(['1', '2']);
  });
});
