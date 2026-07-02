import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BooksBox",
    short_name: "BooksBox",
    description: "Journal de lecture et communauté de lecteurs.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1016",
    theme_color: "#65e6bd",
    lang: "fr",
    orientation: "portrait-primary"
  };
}
