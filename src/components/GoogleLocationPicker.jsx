import {MapPin, Search, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Button, Modal} from './UI';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyBf2iUbP9BlZgSFjFdgym2FHs8LplAFiZk';
const DEFAULT_CENTER = {lat: 22.9734, lng: 78.6569};

let googleMapsPromise;

const loadGoogleMaps = () => {
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Unable to load Google Maps'));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
};

export const parseCoordinates = value => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  return {lat: Number(match[1]), lng: Number(match[2])};
};

export const calculateDistanceKm = (from, to) => {
  if (!from || !to) return null;
  const radians = degrees => (degrees * Math.PI) / 180;
  const latDiff = radians(to.lat - from.lat);
  const lngDiff = radians(to.lng - from.lng);
  const value = Math.sin(latDiff / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(lngDiff / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export const geocodeLocation = async location => {
  const coordinates = parseCoordinates(location);
  if (coordinates) return coordinates;
  const google = await loadGoogleMaps();
  return new Promise(resolve => {
    new google.maps.Geocoder().geocode({address: String(location || ''), componentRestrictions: {country: 'IN'}}, (results, status) => {
      if (status !== 'OK' || !results?.[0]?.geometry?.location) return resolve(null);
      const point = results[0].geometry.location;
      resolve({lat: point.lat(), lng: point.lng()});
    });
  });
};

export default function GoogleLocationPicker({label, value, coordinates, onSelect, placeholder = 'Search location'}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPoint, setMapPoint] = useState(coordinates || parseCoordinates(value) || DEFAULT_CENTER);
  const mapRef = useRef(null);
  const mapElementRef = useRef(null);
  const markerRef = useRef(null);
  const requestId = useRef(0);

  useEffect(() => setQuery(value || ''), [value]);
  useEffect(() => {
    const next = coordinates || parseCoordinates(value);
    if (next) setMapPoint(next);
  }, [coordinates, value]);

  useEffect(() => {
    const search = query.trim();
    if (search.length < 3 || search === value) {
      setResults([]);
      return undefined;
    }
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const google = await loadGoogleMaps();
        const service = new google.maps.places.AutocompleteService();
        service.getPlacePredictions({input: search, componentRestrictions: {country: 'in'}}, predictions => {
          if (requestId.current === currentRequest) setResults(predictions || []);
        });
      } catch (err) {
        if (requestId.current === currentRequest) {
          setResults([]);
          setError(err.message || 'Location search unavailable');
        }
      } finally {
        if (requestId.current === currentRequest) setLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [query, value]);

  useEffect(() => {
    if (!mapOpen) return undefined;
    let cancelled = false;
    loadGoogleMaps().then(google => {
      if (cancelled || !mapElementRef.current) return;
      mapRef.current = new google.maps.Map(mapElementRef.current, {center: mapPoint, zoom: coordinates || parseCoordinates(value) ? 14 : 5});
      markerRef.current = new google.maps.Marker({position: mapPoint, map: mapRef.current, draggable: true});
      mapRef.current.addListener('click', event => {
        const point = {lat: event.latLng.lat(), lng: event.latLng.lng()};
        setMapPoint(point);
        markerRef.current.setPosition(point);
      });
      markerRef.current.addListener('dragend', event => setMapPoint({lat: event.latLng.lat(), lng: event.latLng.lng()}));
    }).catch(err => setError(err.message || 'Map unavailable'));
    return () => { cancelled = true; };
  }, [coordinates, mapOpen, mapPoint, value]);

  const selectPlace = place => {
    setLoading(true);
    setResults([]);
    loadGoogleMaps().then(google => {
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({placeId: place.place_id, fields: ['formatted_address', 'address_components', 'geometry']}, (details, status) => {
        setLoading(false);
        const location = details?.formatted_address || place.description || '';
        const point = details?.geometry?.location ? {lat: details.geometry.location.lat(), lng: details.geometry.location.lng()} : null;
        if (status !== 'OK') return onSelect({location: place.description || ''});
        setQuery(location);
        if (point) setMapPoint(point);
        onSelect({location, address: location, latitude: point?.lat, longitude: point?.lng});
      });
    }).catch(() => {
      setLoading(false);
      onSelect({location: place.description || ''});
    });
  };

  const confirmMap = async () => {
    const location = `${mapPoint.lat.toFixed(6)}, ${mapPoint.lng.toFixed(6)}`;
    setQuery(location);
    setMapOpen(false);
    onSelect({location, address: location, latitude: mapPoint.lat, longitude: mapPoint.lng});
  };

  return <div className="google-location-picker">
    <label className="field"><span>{label}</span><div className="location-search-box"><Search size={18} /><input value={query} placeholder={placeholder} onBlur={() => {if (query.trim() && query !== value) onSelect({location: query.trim()});}} onChange={event => setQuery(event.target.value)} />{query && <button type="button" onClick={() => {setQuery(''); setResults([]); onSelect({location: ''});}}><X size={16} /></button>}</div></label>
    {loading && <small className="location-helper">Searching location...</small>}
    {error && <small className="location-error">{error}</small>}
    {results.length ? <div className="location-results">{results.slice(0, 5).map(place => <button type="button" key={place.place_id} onClick={() => selectPlace(place)}><strong>{place.structured_formatting?.main_text || place.description}</strong><span>{place.structured_formatting?.secondary_text || place.description}</span></button>)}</div> : null}
    {value ? <small className="location-selected">Selected: {value}</small> : null}
    <button type="button" className="select-map-button" onClick={() => setMapOpen(true)}><MapPin size={16} />Select on map</button>
    {mapOpen && <Modal title="Select event location" onClose={() => setMapOpen(false)} wide><div className="map-picker"><div ref={mapElementRef} className="map-canvas" /><p>Click the map or drag the marker to choose event location.</p><Button type="button" onClick={confirmMap}>Confirm location</Button></div></Modal>}
  </div>;
}
