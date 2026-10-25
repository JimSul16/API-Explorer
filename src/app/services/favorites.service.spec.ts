import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { vi } from 'vitest';

import { FavoritesService } from './favorites.service';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

const getMock = vi.mocked(Preferences.get);
const setMock = vi.mocked(Preferences.set);

describe('FavoritesService', () => {
  let svc: FavoritesService;

  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
    getMock.mockResolvedValue({ value: null });
    setMock.mockResolvedValue(undefined);
    TestBed.configureTestingModule({});
    svc = TestBed.inject(FavoritesService);
  });

  it('arranca sin favoritos cuando no hay nada guardado', async () => {
    await svc.init();

    expect(svc.ids()).toEqual([]);
    expect(svc.total()).toBe(0);
    expect(svc.esFavorito('1')).toBe(false);
  });

  it('lee los ids guardados y descarta lo que no sea un id válido', async () => {
    getMock.mockResolvedValue({ value: '["1","2","2","",3,null]' });

    await svc.init();

    expect(svc.ids()).toEqual(['1', '2']); // sin repetidos ni basura
    expect(svc.esFavorito('2')).toBe(true);
  });

  it('un JSON corrupto no rompe la app: arranca vacío', async () => {
    getMock.mockResolvedValue({ value: '{no es json' });

    await svc.init();

    expect(svc.ids()).toEqual([]);
  });

  it('init() es idempotente: no lee dos veces', async () => {
    await svc.init();
    await svc.init();

    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('toggle marca y persiste solo el id en Preferences', async () => {
    await svc.init();

    const marcado = await svc.toggle('42');

    expect(marcado).toBe(true);
    expect(svc.ids()).toEqual(['42']);
    expect(setMock).toHaveBeenCalledWith({ key: 'favoritos', value: '["42"]' });
  });

  it('toggle dos veces desmarca y guarda la lista vacía', async () => {
    await svc.init();
    await svc.toggle('42');

    const marcado = await svc.toggle('42');

    expect(marcado).toBe(false);
    expect(svc.ids()).toEqual([]);
    expect(setMock).toHaveBeenLastCalledWith({ key: 'favoritos', value: '[]' });
  });

  it('si el dispositivo rechaza la escritura, la estrella no miente', async () => {
    await svc.init();
    setMock.mockRejectedValueOnce(new Error('sin espacio'));

    const marcado = await svc.toggle('7');

    expect(marcado).toBe(false);
    expect(svc.ids()).toEqual([]); // se revierte
  });

  it('quitar() solo actúa si estaba marcado', async () => {
    await svc.init();
    await svc.toggle('1');

    await svc.quitar('2');
    expect(setMock).toHaveBeenCalledTimes(1); // no reescribe por un id ausente

    await svc.quitar('1');
    expect(svc.ids()).toEqual([]);
  });

  it('conserva el orden en que se marcaron', async () => {
    await svc.init();

    await svc.toggle('3');
    await svc.toggle('1');
    await svc.toggle('2');

    expect(svc.ids()).toEqual(['3', '1', '2']);
  });
});
