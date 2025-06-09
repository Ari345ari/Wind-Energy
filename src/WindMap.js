import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

// Custom icons with modern design
const createIcon = (color, symbol) => new L.Icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C24.8366 0 32 7.16344 32 16C32 24.8366 16 48 16 48C16 48 0 24.8366 0 16C0 7.16344 7.16344 0 16 0Z" fill="${color}"/>
        <circle cx="16" cy="16" r="10" fill="white"/>
        <text x="16" y="20" text-anchor="middle" font-size="12" fill="${color}">${symbol}</text>
      </svg>
    `)}`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
    shadowSize: [48, 48],
  });
  

const turbineIcon = createIcon('#3b82f6', '⚡');
const suggestedIcon = createIcon('#10b981', '★');
const userIcon = createIcon('#ef4444', '📍');
const weatherIcon = createIcon('#f59e0b', '☁');

// Real Mongolian wind farm data with updated information
const windFarms = [
  {
    id: 1,
    position: [44.915778, 110.237611],
    name: 'Sainshand Wind Farm',
    capacity: 55,
    turbines: 25,
    turbineModel: 'Goldwind GW82/2200',
    unitCapacity: 2.2,
    yearCompleted: 2018,
    operator: 'Newcom Group',
    status: 'Operational',
    annualProduction: 132, // GWh
    capacityFactor: 27.4,
    avgWindSpeed: 7.2,
    coordinates: '44°54\'57"N 110°14\'15"E',
    gridConnection: 'South Gobi Grid',
    investment: 120, // Million USD
  },
  {
    id: 2,
    position: [47.565, 107.206500],
    name: 'Salkhit Wind Farm',
    capacity: 49.6,
    turbines: 31,
    turbineModel: 'Vestas V80',
    unitCapacity: 1.6,
    yearCompleted: 2013,
    operator: 'CleanTech Energy Corp',
    status: 'Operational',
    annualProduction: 115,
    capacityFactor: 26.5,
    avgWindSpeed: 6.8,
    coordinates: '47°33\'54"N 107°12\'23"E',
    gridConnection: 'Central Grid',
    investment: 98,
  },
  {
    id: 3,
    position: [43.559833, 105.613500],
    name: 'Tsetsii Wind Farm',
    capacity: 50,
    turbines: 25,
    turbineModel: 'Goldwind GW87/2000',
    unitCapacity: 2.0,
    yearCompleted: 2017,
    operator: 'Saikhan Ovoo Energy',
    status: 'Operational',
    annualProduction: 125,
    capacityFactor: 28.5,
    avgWindSpeed: 7.0,
    coordinates: '43°33\'35"N 105°36\'49"E',
    gridConnection: 'South Grid',
    investment: 105,
  },
  {
    id: 4,
    position: [45.123456, 111.789012],
    name: 'Khongor Wind Farm',
    capacity: 75,
    turbines: 30,
    turbineModel: 'Vestas V90',
    unitCapacity: 2.5,
    yearCompleted: 2020,
    operator: 'Mongolia Wind Power',
    status: 'Operational',
    annualProduction: 180,
    capacityFactor: 27.4,
    avgWindSpeed: 7.5,
    coordinates: '45°07\'24"N 111°47\'20"E',
    gridConnection: 'Eastern Grid',
    investment: 158,
  },
];

// Enhanced suggested locations with detailed analysis
const suggestedLocations = [
  {
    id: 'sg1',
    position: [45.2, 108.5],
    name: 'South Gobi Corridor Alpha',
    avgWindSpeed: 8.4,
    potential: 'Exceptional',
    estimatedCapacity: 300,
    lcoe: 0.045, // USD per kWh
    score: 96,
    terrain: 'Flat desert plains',
    elevation: 1200,
    accessRoad: 'Good - 15km to highway',
    gridDistance: '8km to existing substation',
    environmentalRisk: 'Low',
    advantages: ['Highest wind speeds in region', 'Excellent grid access', 'Minimal environmental constraints'],
    windDirection: 'NW-SE (predominant)',
    turbulence: 'Low',
    icing: 'Minimal risk',
  },
  {
    id: 'sg2',
    position: [46.1, 111.8],
    name: 'Eastern Steppe Complex',
    avgWindSpeed: 7.9,
    potential: 'Excellent',
    estimatedCapacity: 250,
    lcoe: 0.052,
    score: 91,
    terrain: 'Rolling hills',
    elevation: 980,
    accessRoad: 'Moderate - 25km to highway',
    gridDistance: '12km to transmission line',
    environmentalRisk: 'Low-Medium',
    advantages: ['Consistent wind patterns', 'Large available area', 'Good seasonal variation'],
    windDirection: 'W-E (dominant)',
    turbulence: 'Low-Medium',
    icing: 'Low risk',
  },
  {
    id: 'sg3',
    position: [49.2, 106.3],
    name: 'Northern Plains Hub',
    avgWindSpeed: 7.6,
    potential: 'Very Good',
    estimatedCapacity: 200,
    lcoe: 0.058,
    score: 87,
    terrain: 'Open plains',
    elevation: 750,
    accessRoad: 'Good - 12km to highway',
    gridDistance: '18km to substation',
    environmentalRisk: 'Medium',
    advantages: ['Cross-border potential', 'Good infrastructure', 'Stable wind resource'],
    windDirection: 'SW-NE (seasonal)',
    turbulence: 'Medium',
    icing: 'Medium risk (winter)',
  },
  {
    id: 'sg4',
    position: [44.8, 104.2],
    name: 'Altai Foothills Premium',
    avgWindSpeed: 8.1,
    potential: 'Excellent',
    estimatedCapacity: 280,
    lcoe: 0.049,
    score: 94,
    terrain: 'Gentle slopes',
    elevation: 1450,
    accessRoad: 'Challenging - 35km to highway',
    gridDistance: '22km to transmission line',
    environmentalRisk: 'Medium-High',
    advantages: ['Orographic enhancement', 'Year-round consistency', 'High capacity factor'],
    windDirection: 'Variable (mountain influenced)',
    turbulence: 'Medium-High',
    icing: 'Medium risk',
  },
];

// Weather stations for real-time data simulation
const weatherStations = [
  {
    id: 'ws1',
    position: [47.9077, 106.8832], // Ulaanbaatar
    name: 'Ulaanbaatar Weather Station',
    currentWindSpeed: 5.2,
    currentDirection: 'SW',
    temperature: -12,
    humidity: 68,
    pressure: 1018,
    visibility: 'Good',
  },
  {
    id: 'ws2',
    position: [44.3547, 110.0086], // Sainshand
    name: 'Sainshand Weather Station',
    currentWindSpeed: 7.8,
    currentDirection: 'NW',
    temperature: -8,
    humidity: 45,
    pressure: 1022,
    visibility: 'Excellent',
  },
  {
    id: 'ws3',
    position: [46.2642, 107.7236], // Choir
    name: 'Choir Weather Station',
    currentWindSpeed: 6.3,
    currentDirection: 'W',
    temperature: -15,
    humidity: 72,
    pressure: 1015,
    visibility: 'Good',
  },
];

// Advanced calculations
const calculateAdvancedMetrics = (capacity, windSpeed, turbines) => {
  const capacityFactor = Math.min((windSpeed / 12) * 0.35 + 0.15, 0.45);
  const annualProduction = capacity * 8760 * capacityFactor / 1000; // GWh
  const co2Avoided = annualProduction * 0.85; // tons CO2 per year
  const householdsSupplied = Math.round(annualProduction * 1000 / 3.5); // Average household consumption
  
  return {
    capacityFactor: (capacityFactor * 100).toFixed(1),
    annualProduction: annualProduction.toFixed(1),
    co2Avoided: co2Avoided.toFixed(0),
    householdsSupplied: householdsSupplied.toLocaleString(),
    currentOutput: (capacity * capacityFactor).toFixed(1),
  };
};

const calculateLCOE = (windSpeed, distance) => {
  const baseLCOE = 0.055;
  const windFactor = Math.max(0.8, windSpeed / 8.5);
  const distanceFactor = 1 + (distance / 100) * 0.1;
  return (baseLCOE / windFactor * distanceFactor).toFixed(3);
};

const getWindQuality = (speed) => {
  if (speed >= 8) return { quality: 'Exceptional', color: '#10b981', rating: 'A+' };
  if (speed >= 7) return { quality: 'Excellent', color: '#3b82f6', rating: 'A' };
  if (speed >= 6) return { quality: 'Very Good', color: '#f59e0b', rating: 'B+' };
  if (speed >= 5) return { quality: 'Good', color: '#ef4444', rating: 'B' };
  return { quality: 'Poor', color: '#6b7280', rating: 'C' };
};

// Component to handle map interactions
function MapController({ onMapClick, selectedLocation }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Main component
export default function EnhancedWindMap() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSuggested, setShowSuggested] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [showWindZones, setShowWindZones] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [filterMinCapacity, setFilterMinCapacity] = useState(0);

  // Simulate weather data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time weather updates
      weatherStations.forEach(station => {
        station.currentWindSpeed += (Math.random() - 0.5) * 0.5;
        station.currentWindSpeed = Math.max(0, Math.min(15, station.currentWindSpeed));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleMapClick = (latlng) => {
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const estimatedWindSpeed = 4 + Math.abs(latlng.lat - 46) * 0.3 + Math.random() * 2;
      const nearestGrid = Math.sqrt(Math.pow(latlng.lat - 47, 2) + Math.pow(latlng.lng - 107, 2)) * 50;
      
      setSelectedLocation({
        position: [latlng.lat, latlng.lng],
        name: `Assessment Point`,
        coordinates: `${latlng.lat.toFixed(4)}°N ${latlng.lng.toFixed(4)}°E`,
        avgWindSpeed: estimatedWindSpeed,
        estimatedCapacity: Math.round(estimatedWindSpeed * 25),
        lcoe: calculateLCOE(estimatedWindSpeed, nearestGrid),
        gridDistance: nearestGrid.toFixed(1),
        terrain: 'Mixed terrain',
        elevation: Math.round(800 + Math.random() * 600),
        accessibilityScore: Math.round(60 + Math.random() * 30),
        timestamp: new Date().toLocaleTimeString(),
      });
      setLoading(false);
    }, 800);
  };

  const toggleLayer = (layerType) => {
    setActiveLayer(layerType);
  };

  const filteredWindFarms = windFarms.filter(farm => farm.capacity >= filterMinCapacity);

  return (
    <div style={styles.container}>
      {/* Modern Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>
              🇲🇳 Mongolia Wind Energy Intelligence Platform
            </h1>
            <p style={styles.subtitle}>
              Advanced wind resource assessment and energy planning tool
            </p>
          </div>
          
          <div style={styles.statsBar}>
            <div style={styles.stat}>
              <span style={styles.statValue}>{windFarms.reduce((sum, farm) => sum + farm.capacity, 0)}</span>
              <span style={styles.statLabel}>MW Installed</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{windFarms.length}</span>
              <span style={styles.statLabel}>Active Farms</span>
            </div>
            <div style={styles.stat}>
              <span style={styles.statValue}>{suggestedLocations.length}</span>
              <span style={styles.statLabel}>Prime Locations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.controlGroup}>
          <button
            onClick={() => setShowSuggested(!showSuggested)}
            style={{...styles.controlBtn, ...(showSuggested ? styles.controlBtnActive : {})}}
          >
            ⭐ Prime Locations
          </button>
          
          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{...styles.controlBtn, ...(showWeather ? styles.controlBtnActive : {})}}
          >
            🌤️ Weather Stations
          </button>
          
          <button
            onClick={() => setShowWindZones(!showWindZones)}
            style={{...styles.controlBtn, ...(showWindZones ? styles.controlBtnActive : {})}}
          >
            💨 Wind Zones
          </button>
        </div>

        <div style={styles.controlGroup}>
          <select
            value={activeLayer}
            onChange={(e) => toggleLayer(e.target.value)}
            style={styles.layerSelect}
          >
            <option value="street">Street Map</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
          </select>
          
          <input
            type="range"
            min="0"
            max="100"
            value={filterMinCapacity}
            onChange={(e) => setFilterMinCapacity(Number(e.target.value))}
            style={styles.slider}
          />
          <span style={styles.filterLabel}>Min: {filterMinCapacity}MW</span>
        </div>
      </div>

      {/* Map Container */}
      <div style={styles.mapWrapper}>
        <MapContainer
          center={[46.8625, 103.8467]}
          zoom={6}
          style={styles.map}
          zoomControl={false}
        >
          <TileLayer
            url={
              activeLayer === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : activeLayer === 'terrain'
                ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={
              activeLayer === 'satellite'
                ? '© Esri WorldImagery'
                : activeLayer === 'terrain'
                ? '© OpenTopoMap'
                : '© OpenStreetMap'
            }
          />

          <MapController onMapClick={handleMapClick} selectedLocation={selectedLocation} />

          {/* Wind farms with enhanced popups */}
          {filteredWindFarms.map((farm) => {
            const metrics = calculateAdvancedMetrics(farm.capacity, farm.avgWindSpeed, farm.turbines);
            const windQuality = getWindQuality(farm.avgWindSpeed);
            
            return (
              <Marker key={farm.id} position={farm.position} icon={turbineIcon}>
                <Popup maxWidth={400} className="custom-popup">
                  <div style={styles.popupContent}>
                    <div style={styles.popupHeader}>
                      <h3 style={styles.popupTitle}>⚡ {farm.name}</h3>
                      <div style={{...styles.statusBadge, backgroundColor: '#10b981'}}>
                        {farm.status}
                      </div>
                    </div>
                    
                    <div style={styles.popupGrid}>
                      <div style={styles.popupSection}>
                        <h4 style={styles.sectionTitle}>Technical Specs</h4>
                        <div style={styles.specGrid}>
                          <div><strong>Capacity:</strong> {farm.capacity} MW</div>
                          <div><strong>Turbines:</strong> {farm.turbines} × {farm.unitCapacity}MW</div>
                          <div><strong>Model:</strong> {farm.turbineModel}</div>
                          <div><strong>Completed:</strong> {farm.yearCompleted}</div>
                        </div>
                      </div>

                      <div style={styles.popupSection}>
                        <h4 style={styles.sectionTitle}>Performance</h4>
                        <div style={styles.metricsGrid}>
                          <div style={styles.metric}>
                            <span style={styles.metricValue}>{farm.avgWindSpeed.toFixed(1)} m/s</span>
                            <span style={styles.metricLabel}>Avg Wind Speed</span>
                            <div style={{...styles.windQuality, backgroundColor: windQuality.color}}>
                              {windQuality.rating}
                            </div>
                          </div>
                          <div style={styles.metric}>
                            <span style={styles.metricValue}>{metrics.capacityFactor}%</span>
                            <span style={styles.metricLabel}>Capacity Factor</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.popupSection}>
                        <h4 style={styles.sectionTitle}>Impact</h4>
                        <div style={styles.impactGrid}>
                          <div>🏠 {metrics.householdsSupplied} households</div>
                          <div>🌱 {metrics.co2Avoided}t CO₂ avoided/year</div>
                          <div>⚡ {metrics.annualProduction} GWh/year</div>
                          <div>💰 ${farm.investment}M investment</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Suggested locations */}
          {showSuggested && suggestedLocations.map((location) => {
            const windQuality = getWindQuality(location.avgWindSpeed);
            
            return (
              <Marker key={location.id} position={location.position} icon={suggestedIcon}>
                <Popup maxWidth={450}>
                  <div style={styles.popupContent}>
                    <div style={styles.popupHeader}>
                      <h3 style={styles.popupTitle}>⭐ {location.name}</h3>
                      <div style={styles.scoreContainer}>
                        <div style={{...styles.scoreCircle, borderColor: windQuality.color}}>
                          {location.score}
                        </div>
                      </div>
                    </div>

                    <div style={styles.suggestedGrid}>
                      <div style={styles.windMetric}>
                        <span style={styles.windSpeed}>{location.avgWindSpeed.toFixed(1)} m/s</span>
                        <span style={{...styles.windQuality, backgroundColor: windQuality.color}}>
                          {windQuality.quality}
                        </span>
                      </div>

                      <div style={styles.potentialMetrics}>
                        <div><strong>Capacity:</strong> {location.estimatedCapacity} MW</div>
                        <div><strong>LCOE:</strong> ${location.lcoe}/kWh</div>
                        <div><strong>Elevation:</strong> {location.elevation}m</div>
                        <div><strong>Grid:</strong> {location.gridDistance}</div>
                      </div>

                      <div style={styles.advantagesList}>
                        <h4>Key Advantages:</h4>
                        {location.advantages.map((advantage, idx) => (
                          <div key={idx} style={styles.advantage}>
                            ✓ {advantage}
                          </div>
                        ))}
                      </div>

                      <div style={styles.technicalDetails}>
                        <div><strong>Terrain:</strong> {location.terrain}</div>
                        <div><strong>Access:</strong> {location.accessRoad}</div>
                        <div><strong>Wind Direction:</strong> {location.windDirection}</div>
                        <div><strong>Environmental Risk:</strong> {location.environmentalRisk}</div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Weather stations */}
          {showWeather && weatherStations.map((station) => (
            <Marker key={station.id} position={station.position} icon={weatherIcon}>
              <Popup>
                <div style={styles.weatherPopup}>
                  <h4>🌤️ {station.name}</h4>
                  <div style={styles.weatherGrid}>
                    <div><strong>Wind:</strong> {station.currentWindSpeed.toFixed(1)} m/s {station.currentDirection}</div>
                    <div><strong>Temp:</strong> {station.temperature}°C</div>
                    <div><strong>Humidity:</strong> {station.humidity}%</div>
                    <div><strong>Pressure:</strong> {station.pressure} hPa</div>
                    <div><strong>Visibility:</strong> {station.visibility}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Wind zones visualization */}
          {showWindZones && suggestedLocations.map((location) => (
            <Circle
              key={`zone-${location.id}`}
              center={location.position}
              radius={location.avgWindSpeed * 2000}
              pathOptions={{
                color: getWindQuality(location.avgWindSpeed).color,
                fillColor: getWindQuality(location.avgWindSpeed).color,
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          ))}

          {/* User selected location */}
          {selectedLocation && (
            <Marker position={selectedLocation.position} icon={userIcon}>
              <Popup>
                <div style={styles.userPopup}>
                  <h4>📍 Wind Assessment</h4>
                  <div style={styles.assessmentGrid}>
                    <div><strong>Location:</strong> {selectedLocation.coordinates}</div>
                    <div><strong>Wind Speed:</strong> {selectedLocation.avgWindSpeed.toFixed(1)} m/s</div>
                    <div><strong>Potential:</strong> {selectedLocation.estimatedCapacity} MW</div>
                    <div><strong>LCOE:</strong> ${selectedLocation.lcoe}/kWh</div>
                    <div><strong>Grid Distance:</strong> {selectedLocation.gridDistance} km</div>
                    <div><strong>Elevation:</strong> {selectedLocation.elevation}m</div>
                    <div><strong>Assessed:</strong> {selectedLocation.timestamp}</div>
                  </div>
                  <div style={{...styles.windQuality, backgroundColor: getWindQuality(selectedLocation.avgWindSpeed).color, marginTop: '10px'}}>
                    {getWindQuality(selectedLocation.avgWindSpeed).quality}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Loading overlay */}
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner}>
              <div style={styles.spinner}></div>
              <p>Analyzing wind potential...</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoPanelContent}>
          <h3>🗺️ Interactive Features</h3>
          <div style={styles.featureGrid}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⚡</span>
              <div>
                <strong>Existing Wind Farms</strong>
                <p>Detailed performance data and technical specifications</p>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>⭐</span>
              <div>
                <strong>Prime Development Sites</strong>
                <p>AI-identified optimal locations with comprehensive analysis</p>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🌤️</span>
              <div>
                <strong>Real-time Weather</strong>
                <p>Current conditions from meteorological stations</p>
              </div>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📍</span>
              <div>
                <strong>Custom Assessment</strong>
                <p>Click anywhere to evaluate wind energy potential</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Comprehensive styling
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  
  titleSection: {
    flex: 1,
  },
  
  title: {
    fontSize: '2.2rem',
    fontWeight: '700',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  
  subtitle: {
    fontSize: '1.1rem',
    color: '#6b7280',
    margin: 0,
  },
  
  statsBar: {
    display: 'flex',
    gap: '30px',
  },
  
  stat: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  
  statLabel: {
    fontSize: '0.9rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  controlPanel: {
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    flexWrap: 'wrap',
    gap: '15px',
  },
  
  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  controlBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: '2px solid #e5e7eb',
    background: 'white',
    color: '#374151',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  controlBtnActive: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderColor: '#667eea',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
  },
  
  layerSelect: {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    background: 'white',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  
  slider: {
    width: '120px',
    height: '6px',
    borderRadius: '3px',
    background: '#e5e7eb',
    outline: 'none',
    cursor: 'pointer',
  },
  
  filterLabel: {
    fontSize: '0.85rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  
  mapWrapper: {
    flex: 1,
    position: 'relative',
    margin: '0 20px 20px 20px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
  },
  
  map: {
    height: '100%',
    width: '100%',
  },
  
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  loadingSpinner: {
    textAlign: 'center',
    color: '#374151',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px auto',
  },
  
  popupContent: {
    maxWidth: '100%',
    padding: '0',
  },
  
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '2px solid #f3f4f6',
  },
  
  popupTitle: {
    margin: 0,
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  popupGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  
  popupSection: {
    background: '#f9fafb',
    padding: '12px',
    borderRadius: '8px',
  },
  
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
  },
  
  specGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  
  metricsGrid: {
    display: 'flex',
    gap: '15px',
  },
  
  metric: {
    textAlign: 'center',
    flex: 1,
  },
  
  metricValue: {
    display: 'block',
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  
  metricLabel: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '4px',
  },
  
  windQuality: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'white',
    marginTop: '8px',
  },
  
  impactGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  
  scoreContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  
  scoreCircle: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1f2937',
    background: 'white',
  },
  
  suggestedGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  windMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f0f9ff',
    borderRadius: '8px',
  },
  
  windSpeed: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#1f2937',
  },
  
  potentialMetrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  },
  
  advantagesList: {
    padding: '12px',
    background: '#f0fdf4',
    borderRadius: '8px',
  },
  
  advantage: {
    fontSize: '0.9rem',
    color: '#059669',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  
  technicalDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    fontSize: '0.85rem',
    color: '#6b7280',
  },
  
  weatherPopup: {
    minWidth: '250px',
  },
  
  weatherGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    fontSize: '0.9rem',
    marginTop: '10px',
  },
  
  userPopup: {
    minWidth: '280px',
  },
  
  assessmentGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '0.9rem',
    marginTop: '10px',
  },
  
  infoPanel: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    margin: '0 20px 20px 20px',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  },
  
  infoPanelContent: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '15px',
  },
  
  feature: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  
  featureIcon: {
    fontSize: '1.5rem',
    padding: '8px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'block',
    minWidth: '40px',
    textAlign: 'center',
  },
}