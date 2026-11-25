import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LocateFixed, MapPin, Search } from 'lucide-react';
import type { CityLocation } from '../types/airwise.ts';
import { PRESET_CITIES } from '../data/presets.ts';
import { isCoordinateInIndia } from '../lib/aqi.ts';
import { searchCityLocations } from '../lib/airQualityClient.ts';

interface LocationSelectorProps {
  currentLocation: CityLocation;
  onSelectLocation: (loc: CityLocation) => void;
  compact?: boolean;
}

export function LocationSelector({
  currentLocation,
  onSelectLocation,
  compact = false,
}: LocationSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const searchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      searchControllerRef.current?.abort();
    };
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (clean.length < 2) {
      setFeedback('Enter at least 2 characters to search a city or neighborhood.');
      return;
    }

    searchControllerRef.current?.abort();
    const controller = new AbortController();
    searchControllerRef.current = controller;

    setSearching(true);
    setFeedback(null);
    try {
      const { results: list, error } = await searchCityLocations(clean, controller.signal);
      if (controller.signal.aborted) return;
      if (error) {
        setFeedback(error);
        setResults([]);
      } else {
        setResults(list);
        if (list.length === 0) {
          setFeedback(`No cities found matching "${clean}". Try a nearby major city.`);
        } else {
          setAnnouncement(`Found ${list.length} matching location${list.length === 1 ? '' : 's'} for ${clean}.`);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFeedback('Unable to reach location search right now. Select a preset city below.');
    } finally {
      if (!controller.signal.aborted) {
        setSearching(false);
      }
    }
  }

  function handleSelectCity(loc: CityLocation) {
    onSelectLocation(loc);
    setAnnouncement(`Selected location ${loc.name}, ${loc.country}.`);
  }

  function handleUseMyLocation() {
    if (!('geolocation' in navigator)) {
      setFeedback('Browser geolocation is unavailable on this device. Choose a city manually.');
      return;
    }
    setGeoLoading(true);
    setFeedback(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          setGeoLoading(false);
          setFeedback('Received invalid device coordinates. Please search your city manually.');
          return;
        }
        const isIndia = isCoordinateInIndia(latitude, longitude);
        const gpsLoc: CityLocation = {
          id: `gps-${latitude.toFixed(2)}-${longitude.toFixed(2)}`,
          name: 'My Current Area',
          area: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          region: 'Detected Coordinates',
          country: isIndia ? 'India' : 'Local Region',
          countryCode: isIndia ? 'IN' : 'LOC',
          latitude,
          longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
          isIndia,
        };
        handleSelectCity(gpsLoc);
        setGeoLoading(false);
        setResults([]);
      },
      (err) => {
        setGeoLoading(false);
        setFeedback(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was declined. You can search or pick any city below.'
            : 'Could not determine coordinates. Please search your city manually.'
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5 text-sm text-[#102A43]">
          <MapPin className="h-4 w-4 text-[#20C997] shrink-0" aria-hidden="true" />
          <span className="font-semibold">{currentLocation.name}</span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-600">
            {currentLocation.region}, {currentLocation.country}
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="flex items-center gap-2" role="search">
            <label htmlFor="city-search-input" className="sr-only">
              Search city or urban area
            </label>
            <div className="relative flex-1 sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="city-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city (e.g., Pune, Delhi, Tokyo)"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-[#102A43] placeholder:text-slate-500 focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/30"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-[#102A43] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1a3f63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {searching ? 'Finding...' : 'Search'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-medium text-[#102A43] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <LocateFixed className="h-4 w-4 text-[#20C997]" aria-hidden="true" />
            <span>{geoLoading ? 'Locating...' : 'Use My Location'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <p className="mt-2.5 text-xs font-medium text-amber-800" role="status">
          {feedback}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-semibold text-slate-600">Matching Locations</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  handleSelectCity(item);
                  setResults([]);
                  setQuery('');
                }}
                className="flex flex-col items-start rounded-lg border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-[#38BDF8] hover:bg-sky-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8]"
              >
                <span className="font-semibold text-[#102A43]">{item.name}</span>
                <span className="text-xs text-slate-600 truncate max-w-full">
                  {item.region}, {item.country}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <span className="mr-1 text-xs font-medium text-slate-600">Quick Cities:</span>
          {PRESET_CITIES.map((city) => {
            const active = city.id === currentLocation.id;
            return (
              <button
                key={city.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleSelectCity(city)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38BDF8] ${
                  active
                    ? 'bg-[#102A43] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
