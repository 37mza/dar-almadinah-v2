// Map settings.
// The Mapbox token is read from the PUBLIC_MAPBOX_TOKEN environment variable (Vercel > Settings >
// Environment Variables). It is never stored in the code. It must be a public token (starts with pk.)
// and should be URL-restricted in the Mapbox dashboard to https://www.daralmadinah.com.sa and
// https://dar-almadinah-v2.vercel.app. Without it, the site simply hides the Map view.
export const MAPBOX_TOKEN: string = (import.meta.env.PUBLIC_MAPBOX_TOKEN ?? '').trim();
export const MAP_ENABLED = MAPBOX_TOKEN.startsWith('pk.');

export const MAP_STYLES = {
  light: 'mapbox://styles/abdullahalrachid/cms4p72qo00wy01qz3z2obkui', // your custom style from the old map
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const MAP_CENTER: [number, number] = [39.611082, 24.467218]; // Madinah
