import { aFallo, esNoEncontrado, etiquetaDeFallo, mensajeDeFallo } from './fallos';

describe('lib/fallos', () => {
  it('explica distinto cada tipo de fallo', () => {
    expect(mensajeDeFallo({ tipo: 'red', status: 0 })).toContain('No hay conexión');
    expect(mensajeDeFallo({ tipo: 'limite', status: 429 })).toContain('Demasiadas peticiones');
    expect(mensajeDeFallo({ tipo: 'servidor', status: 503 })).toContain('Kitsu está fallando');
    expect(mensajeDeFallo({ tipo: 'cliente', status: 400 })).toContain('rechazó la petición');
    expect(mensajeDeFallo({ tipo: 'desconocido', status: 0 })).toContain('Algo falló dentro de la app');
  });

  it('la etiqueta corta sigue al tipo, y sin fallo habla del catálogo', () => {
    expect(etiquetaDeFallo(null)).toBe('Error al cargar el catálogo');
    expect(etiquetaDeFallo({ tipo: 'red', status: 0 })).toBe('Sin conexión con la API');
    expect(etiquetaDeFallo({ tipo: 'desconocido', status: 0 })).toBe('Error inesperado en la app');
  });

  it('aFallo respeta lo ya clasificado por el servicio', () => {
    expect(aFallo({ tipo: 'limite', status: 429 })).toEqual({ tipo: 'limite', status: 429 });
  });

  it('aFallo no disfraza un error de programación de "sin conexión"', () => {
    expect(aFallo(new TypeError('boom'))).toEqual({ tipo: 'desconocido', status: 0 });
    expect(aFallo(undefined)).toEqual({ tipo: 'desconocido', status: 0 });
  });

  it('solo el 404 del cliente es "no encontrado"', () => {
    expect(esNoEncontrado({ tipo: 'cliente', status: 404 })).toBe(true);
    expect(esNoEncontrado({ tipo: 'cliente', status: 400 })).toBe(false);
    expect(esNoEncontrado({ tipo: 'red', status: 0 })).toBe(false);
    expect(esNoEncontrado(null)).toBe(false);
  });
});
