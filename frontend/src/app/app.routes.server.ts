import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
<<<<<<< HEAD
    renderMode: RenderMode.Server
=======
    renderMode: RenderMode.Client
>>>>>>> ea3cef4f4e3f8fdeffdaa07d034c781727ab1d09
  }
];
