import L from 'leaflet';
import 'leaflet-routing-machine';

// Debug: Check if Leaflet is loaded
console.log('Leaflet (L):', L);
console.log(L.Routing);

let map;
let customIcon;
let userMarker;
let userLocation;

export function initMap() {
  if (!L) {
    console.error('Leaflet is not defined. Check script tag or module resolution.');
    return;
  }
  map = L.map('map').setView([0, 0], 13);
  // Neumorphic coffee marker
  customIcon = L.divIcon({
    className: 'custom-neumorphic-icon',
    html: '<div class="neumorphic-marker"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  // Carto Light Tiles
  const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: ' Carto',
  }).addTo(map);

  tileLayer.on('tileerror', (error) => {
    console.error('Carto tile error:', error.tile.src);
    console.warn('Switching to fallback Stamen terrain tiles...');

    map.removeLayer(tileLayer);

    const fallback = L.tileLayer('https://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png', {
      attribution: ' Stamen Design',
      maxZoom: 18
    }).addTo(map);

    fallback.on('tileerror', (err) => {
      console.error('Stamen fallback error:', err.tile.src);
      document.getElementById('map')?.classList.add('map-failed');
    });

    fallback.on('load', () => console.log('Fallback tiles loaded successfully'));
  });

  tileLayer.on('load', () => console.log('Carto tiles loaded successfully'));

  // Recalculate map dimensions
  setTimeout(() => {
    map.invalidateSize();
    console.log('Map size recalculated');
  }, 100);

  // Set up user location button
  const userLocationButton = document.getElementById('user-location-button');
  if (userLocationButton) {
    userLocationButton.addEventListener('click', () => {
      console.log('User location button clicked');
      locateUser();
    });
  } else {
    console.error('User location button not found');
  }

  // Optionally auto-locate user
  locateUser();
}

function locateUser() {
  if (!navigator.geolocation) {
    alert('Geolocation not supported by your browser.');
    return;
  }

  const btn = document.getElementById('user-location-button');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="w-6 h-6 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v2a2 2 0 002 2h12a2 2 0 002-2V4M8 12h8M10 16h4"/>
      </svg>
      Locating...
    `;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = [position.coords.latitude, position.coords.longitude];
      console.log('User located at:', userLocation);

      if (map) {
        map.setView(userLocation, 14);
        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.marker(userLocation, { icon: customIcon })
          .addTo(map)
          .bindPopup('You are here')
          .openPopup();

        map.invalidateSize();
      }

      resetLocationButton();
    },
    (error) => {
      console.error('Geolocation failed:', error.message);
      let message = `Unable to get location: ${error.message}`;

      if (error.code === 1) {
        message += ' (Permission denied. Please allow access.)';
      } else if (error.code === 3) {
        message += ' (Request timed out.)';
      }

      alert(message);

      userLocation = userLocation || [48.8566, 2.3522]; // fallback: Paris
      map?.setView(userLocation, 14);
      if (userMarker) map.removeLayer(userMarker);

      userMarker = L.marker(userLocation, { icon: customIcon })
        .addTo(map)
        .bindPopup('Default location (Paris)')
        .openPopup();

      resetLocationButton();
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function resetLocationButton() {
  const btn = document.getElementById('user-location-button');
  if (!btn) return;

  btn.disabled = false;
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
</svg>

  `;
}

export function getMapInstance() {
  return { map, customIcon };
}

export function getUserLocation() {
  return userLocation;
}

let routingControl;
let routeLabel;

export function showRouteTo(shopLatLng, userLatLng) {
  if (!map || !shopLatLng || !userLatLng) return;

  if (!L.Routing) {
    console.error('L.Routing is not available. Check leaflet-routing-machine script tag.');
    return;
  }

  clearRoute();

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(userLatLng[0], userLatLng[1]),
      L.latLng(shopLatLng[0], shopLatLng[1])
    ],
    routeWhileDragging: false,
    draggableWaypoints: false,
    createMarker: () => null,
    show: false,
    lineOptions: {
      styles: [
      { color: '#333', weight: 8 },     // Border (thicker, dark color)
        { color: '#c7f5d3', weight: 7 }
      ]
    }
  });

  routingControl.on('routesfound', function(e) {
    var routes = e.routes;
    var summary = routes[0].summary;
    var driveTime = Math.round(summary.totalTime / 60); // in minutes
    var driveDistance = (summary.totalDistance / 1000).toFixed(1); // in km

    var text = `Drive time: ${driveTime} minutes (${driveDistance} km)`;
    var midpoint = L.latLng((shopLatLng[0] + userLatLng[0]) / 2, (shopLatLng[1] + userLatLng[1]) / 2);

    routeLabel = L.marker(midpoint, {
      icon: L.divIcon({
        className: 'route-label',
        html: `<div>${text}</div>`,
        iconSize: [200, 20]
      })
    }).addTo(map);
  });

  routingControl.addTo(map);
}

export function clearRoute() {
  const mapInstance = getMapInstance();
  if (mapInstance && mapInstance.map) {
    const map = mapInstance.map;
    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
    if (routeLabel) {
      map.removeLayer(routeLabel);
      routeLabel = null;
    }
  }
}
