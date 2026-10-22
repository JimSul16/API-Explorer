// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  /** Endpoint de Kitsu (JSON:API). Único punto donde se cambia la API. */
  apiUrl: 'https://kitsu.io/api/edge/anime',
};
