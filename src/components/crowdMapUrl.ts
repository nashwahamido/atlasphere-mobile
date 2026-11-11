import { API_URL } from '@/lib/config';

export type CrowdMapData = {
  lat: number;
  lon: number;
  theme?: 'light' | 'dark';
  points: [number, number, number][]; // lat, lon, weight
  closed: [number, number, string][]; // lat, lon, name
};

// Data travels in the URL hash, so it's never sent to the server.
export function crowdMapUrl(data: CrowdMapData) {
  return API_URL + '/embed/crowd-map.html#' + encodeURIComponent(JSON.stringify(data));
}
