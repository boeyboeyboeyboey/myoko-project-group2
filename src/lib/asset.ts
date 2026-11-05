/** Prefix a public/ path with the build's base URL ("/" locally, "/myoko-project-group2/" on GitHub Pages). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, "");
