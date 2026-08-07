/* Route table. Every public URL of the redesign is produced here, so the build
   and the tests share one source of truth about what the site contains. */

import { homeRoute } from "./pages/home.mjs";
import { catalogRoutes } from "./pages/catalog.mjs";
import { articleRoutes } from "./pages/articles.mjs";
import { authorRoutes } from "./pages/author.mjs";
import { infoRoutes } from "./pages/info.mjs";

export function buildRoutes() {
  return [
    homeRoute(),
    ...catalogRoutes(),
    ...articleRoutes(),
    ...authorRoutes(),
    ...infoRoutes()
  ];
}
