import React, { useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import './App.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

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
const userIcon = createIcon('#ef4444', '📍');

// Constants
const USD_TO_MNT = 3450;
const FINANCIAL_PARAMS = {
  bookLife: 25,
  discountRate: 0.08,
  overnightCapitalCost: 1500,
  fixedOM: 40,
  variableOM: 0.01,
};

const windFarms = [
  {
    id: 1,
    position: [47.570583, 107.220417],
    name: 'Salkhit Wind Farm',
    capacity: 49.6,
    turbines: 31,
    yearCompleted: 2013,
    status: 'Operational',
    annualProduction: 168.5,
  },
  {
    id: 2,
    position: [43.559833, 105.613500],
    name: 'Tsetsii Wind Farm',
    capacity: 50,
    turbines: 25,
    yearCompleted: 2017,
    status: 'Operational',
    annualProduction: 150,
  },
  {
    id: 3,
    position: [44.915778, 110.237611],
    name: 'Sainshand Wind Farm',
    capacity: 55,
    turbines: 25,
    yearCompleted: 2018,
    status: 'Operational',
    annualProduction: 190,
  },
];

const gridLocations = [
  { lat: 47.92, lon: 106.92 },
  { lat: 44.915778, lon: 110.237611 },
  { lat: 43.559833, lon: 105.613500 },
];

const createGridDistanceCalculator = () => {
  const cache = new Map();
  
  return (lat, lon) => {
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    
    let minDistance = Infinity;
    gridLocations.forEach(grid => {
      const R = 6371;
      const dLat = (grid.lat - lat) * Math.PI / 180;
      const dLon = (grid.lon - lon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(grid.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      if (distance < minDistance) minDistance = distance;
    });
    
    cache.set(key, minDistance);
    return minDistance;
  };
};

const calculateCapacityFactor = (avgWindSpeed) => {
  const points = [
    { speed: 4, cf: 0.15 },
    { speed: 6, cf: 0.25 },
    { speed: 7, cf: 0.32 },
    { speed: 8, cf: 0.38 },
    { speed: 9, cf: 0.42 },
    { speed: 10, cf: 0.45 }
  ];
  
  if (avgWindSpeed <= points[0].speed) return points[0].cf;
  if (avgWindSpeed >= points[points.length - 1].speed) return points[points.length - 1].cf;
  
  for (let i = 0; i < points.length - 1; i++) {
    if (avgWindSpeed >= points[i].speed && avgWindSpeed <= points[i + 1].speed) {
      const ratio = (avgWindSpeed - points[i].speed) / (points[i + 1].speed - points[i].speed);
      return points[i].cf + ratio * (points[i + 1].cf - points[i].cf);
    }
  }
  
  return 0.30;
};

const calculateCRF = (interestRate, periods) => {
  const numerator = interestRate * Math.pow(1 + interestRate, periods);
  const denominator = Math.pow(1 + interestRate, periods) - 1;
  return numerator / denominator;
};

const calculateLCOE = (capacityFactor, gridDistance) => {
  const crf = calculateCRF(FINANCIAL_PARAMS.discountRate, FINANCIAL_PARAMS.bookLife);
  const transmissionCost = gridDistance * 1.2;
  const totalCapitalCost = FINANCIAL_PARAMS.overnightCapitalCost + transmissionCost;
  const numerator = (totalCapitalCost * crf) + FINANCIAL_PARAMS.fixedOM;
  const denominator = 8760 * capacityFactor;
  return (numerator / denominator) + FINANCIAL_PARAMS.variableOM;
};

const getWindQuality = (speed) => {
  if (speed >= 8) return { quality: 'Exceptional', color: '#10b981' };
  if (speed >= 7) return { quality: 'Excellent', color: '#3b82f6' };
  if (speed >= 6) return { quality: 'Very Good', color: '#f59e0b' };
  if (speed >= 5) return { quality: 'Good', color: '#ef4444' };
  return { quality: 'Poor', color: '#6b7280' };
};

const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);
  return useCallback((...args) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

const WindFarmPopup = ({ farm }) => (
  <div className="popup-content">
    <div className="popup-header">
      <h3 className="popup-title">⚡ {farm.name}</h3>
      <span className="status-badge">{farm.status}</span>
    </div>
    
    <div className="popup-section">
      <div className="info-grid">
        <div><strong>Capacity:</strong> {farm.capacity} MW</div>
        <div><strong>Turbines:</strong> {farm.turbines}</div>
        <div><strong>Year:</strong> {farm.yearCompleted}</div>
        <div><strong>Output:</strong> {farm.annualProduction} GWh/year</div>
      </div>
    </div>
  </div>
);

const AssessmentPopup = ({ location, onSave, isSaved }) => {
  const windQuality = getWindQuality(location.avgWindSpeed);
  
  return (
    <div className="popup-content">
      <div className="popup-header">
        <h4 className="assessment-title">📍 Site Assessment</h4>
        {!isSaved && (
          <button 
            onClick={() => onSave(location)}
            className="save-btn"
            title="Save for comparison"
          >
            💾 Save
          </button>
        )}
      </div>
      
      <div className="popup-section">
        <div className="info-grid">
          <div><strong>Location:</strong> {location.coordinates}</div>
          <div><strong>Wind Speed:</strong> {location.avgWindSpeed.toFixed(1)} m/s</div>
          <div><strong>Wind Quality:</strong> <span style={{ color: windQuality.color, fontWeight: 600 }}>{windQuality.quality}</span></div>
          <div><strong>Capacity Factor:</strong> {location.capacityFactor}%</div>
          <div><strong>Est. Capacity:</strong> {location.estimatedCapacity} MW</div>
        </div>
      </div>

      <div className="popup-section">
        <h5 className="section-title">Economics</h5>
        <div className="info-grid">
          <div><strong>LCOE:</strong> ${location.lcoeUSD}/kWh (₮{location.lcoeMNT}/kWh)</div>
        </div>
      </div>

      <div className="popup-section">
        <h5 className="section-title">Grid Connectivity</h5>
        <div className="info-grid">
          <div><strong>Distance:</strong> {location.gridDistance} km</div>
          <div><strong>Feasibility:</strong> <span style={{ 
            color: location.gridFeasibility === 'Excellent' ? '#10b981' : 
                   location.gridFeasibility === 'Good' ? '#3b82f6' :
                   location.gridFeasibility === 'Fair' ? '#f59e0b' : '#ef4444',
            fontWeight: 600 
          }}>{location.gridFeasibility}</span></div>
          <div style={{ fontSize: '0.8rem', color: '#6b7280', fontStyle: 'italic' }}>{location.gridNotes}</div>
        </div>
      </div>
      
      {location.monthlyTrends && location.monthlyTrends.length > 0 && (
        <div className="popup-section">
          <h5 className="section-title">Wind Trends (30 days)</h5>
          <div className="mini-chart">
            {location.monthlyTrends.map((trend, idx) => (
              <div key={idx} className="trend-bar">
                <div 
                  className="trend-fill"
                  style={{ 
                    width: `${(trend.avg / 12) * 100}%`,
                    background: `linear-gradient(90deg, #3b82f6, #2563eb)`
                  }}
                />
                <span className="trend-label">{trend.month.substring(5)}: {trend.avg.toFixed(1)} m/s</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function MapController({ onMapClick }) {
  const abortControllerRef = useRef(null);
  
  useMapEvents({
    click(e) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      onMapClick(e.latlng, abortControllerRef.current);
    },
  });
  
  return null;
}

function MongoliaWindMap() {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [error, setError] = useState(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [filterMinCapacity, setFilterMinCapacity] = useState(0);
  const [savedAssessments, setSavedAssessments] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  
  const calculateGridDistance = useMemo(() => createGridDistanceCalculator(), []);

  const debouncedMapClick = useDebounce(async (latlng, abortController) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latlng.lat}&longitude=${latlng.lng}&daily=wind_speed_10m_max,wind_speed_10m_mean&current=wind_speed_10m&past_days=30&forecast_days=7&timezone=auto`,
        { signal: abortController?.signal }
      );
      
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      
      const data = await res.json();
      
      if (!data.daily?.wind_speed_10m_max) {
        throw new Error('No wind data available');
      }
      
      const dailyWindSpeedsMean = data.daily.wind_speed_10m_mean;
      const timestamps = data.daily.time;
      
      const recentData = dailyWindSpeedsMean.slice(-30);
      const avgWindSpeed = recentData.reduce((a, b) => a + b, 0) / recentData.length;
      
      const monthlyAvg = {};
      timestamps.forEach((time, idx) => {
        const month = time.substring(0, 7);
        if (!monthlyAvg[month]) monthlyAvg[month] = [];
        monthlyAvg[month].push(dailyWindSpeedsMean[idx]);
      });
      
      const monthlyTrends = Object.entries(monthlyAvg).map(([month, speeds]) => ({
        month,
        avg: speeds.reduce((a, b) => a + b, 0) / speeds.length
      }));
      
      const gridDistance = calculateGridDistance(latlng.lat, latlng.lng);
      const capacityFactor = calculateCapacityFactor(avgWindSpeed);
      const estimatedCapacity = Math.round(avgWindSpeed * 30);
      const lcoeUSD = calculateLCOE(capacityFactor, gridDistance);
      
      let gridFeasibility = 'Good';
      let gridNotes = 'Reasonable connection distance';
      if (gridDistance > 200) {
        gridFeasibility = 'Poor';
        gridNotes = 'Very remote - high transmission costs';
      } else if (gridDistance > 100) {
        gridFeasibility = 'Fair';
        gridNotes = 'Moderate distance - consider substation';
      } else if (gridDistance < 30) {
        gridFeasibility = 'Excellent';
        gridNotes = 'Close proximity to grid';
      }
      
      const assessment = {
        id: Date.now(),
        position: [latlng.lat, latlng.lng],
        coordinates: `${latlng.lat.toFixed(4)}°N ${latlng.lng.toFixed(4)}°E`,
        avgWindSpeed,
        estimatedCapacity,
        capacityFactor: (capacityFactor * 100).toFixed(1),
        lcoeUSD: lcoeUSD.toFixed(3),
        lcoeMNT: (lcoeUSD * USD_TO_MNT).toFixed(0),
        gridDistance: gridDistance.toFixed(1),
        gridFeasibility,
        gridNotes,
        historicalData: dailyWindSpeedsMean.slice(-30),
        timestamps: timestamps.slice(-30),
        monthlyTrends,
        savedAt: new Date().toISOString(),
      };
      
      setSelectedLocation(assessment);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Assessment failed:', err);
      setError('Failed to assess location. Please try again.');
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  }, 500);

  const filteredWindFarms = windFarms.filter(farm => farm.capacity >= filterMinCapacity);
  const totalCapacity = windFarms.reduce((sum, farm) => sum + farm.capacity, 0);

  const handleSaveAssessment = (location) => {
    if (savedAssessments.find(a => a.id === location.id)) return;
    setSavedAssessments(prev => [...prev, location]);
    setError('Assessment saved! ✓');
    setTimeout(() => setError(null), 2000);
  };

  const handleRemoveAssessment = (id) => {
    setSavedAssessments(prev => prev.filter(a => a.id !== id));
  };

  const handleClearAll = () => {
    setSavedAssessments([]);
    setShowComparison(false);
  };

  return (
    <div className="wind-map-container">
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="modal-overlay" onClick={() => setShowInstructions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setShowInstructions(false)}
            >
              ×
            </button>
            <h2 className="modal-title">Welcome to WindScout</h2>
            <div className="modal-body">
              <div className="instruction-step">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h3>Explore Wind Farms</h3>
                  <p>Blue turbine markers (⚡) show existing operational wind farms across Mongolia</p>
                </div>
              </div>
              <div className="instruction-step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h3>Assess New Sites</h3>
                  <p>Click anywhere on the map to analyze wind potential. A red location marker (📍) will appear with detailed assessment data</p>
                </div>
              </div>
              <div className="instruction-step">
                <span className="step-number">3</span>
                <div className="step-content">
                  <h3>Compare Locations</h3>
                  <p>Click the 💾 Save button in any assessment popup to save it for comparison. View all saved sites using the Compare button</p>
                </div>
              </div>
              <div className="instruction-step">
                <span className="step-number">4</span>
                <div className="step-content">
                  <h3>Customize View</h3>
                  <p>Switch between map layers and filter wind farms by capacity using the controls at the bottom</p>
                </div>
              </div>
            </div>
            <button 
              className="modal-start-btn"
              onClick={() => setShowInstructions(false)}
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="error-banner" role="alert">
          ⚠️ {error}
        </div>
      )}

      {/* Header */}
      <header className={`header-panel ${uiVisible ? 'visible' : 'hidden'}`}>
        <div className="title-row">
          <h1 className="main-title">WindScout Mongolia</h1>
          <span className="live-badge">Demo</span>
        </div>
        <p className="subtitle">Wind farm locations & site assessment</p>
        
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-value">{totalCapacity.toFixed(1)}</span>
            <span className="stat-label">MW Total</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{windFarms.length}</span>
            <span className="stat-label">Active Farms</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">Click Map</span>
            <span className="stat-label">To Assess</span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <nav className={`controls-panel ${uiVisible ? 'visible' : 'hidden'}`}>
        <div className="control-row">
          <select
            value={activeLayer}
            onChange={(e) => setActiveLayer(e.target.value)}
            className="layer-select"
          >
            <option value="street">Street Map</option>
            <option value="satellite">Satellite</option>
            <option value="terrain">Terrain</option>
          </select>
          
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="60"
              value={filterMinCapacity}
              onChange={(e) => setFilterMinCapacity(Number(e.target.value))}
              className="capacity-slider"
            />
            <span className="slider-label">Min: {filterMinCapacity}MW</span>
          </div>
          
          {savedAssessments.length > 0 && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`control-btn ${showComparison ? 'active' : ''}`}
            >
              📊 Compare ({savedAssessments.length})
            </button>
          )}
          
          <button
            onClick={() => setShowInstructions(true)}
            className="control-btn help-btn"
            title="Show instructions"
          >
            ❓ Help
          </button>
        </div>
      </nav>

      {/* Comparison Panel */}
      {showComparison && savedAssessments.length > 0 && (
        <div className="comparison-panel">
          <div className="comparison-header">
            <h3>Site Comparison</h3>
            <button onClick={handleClearAll} className="clear-all-btn">Clear All</button>
          </div>
          <div className="comparison-grid">
            {savedAssessments.map((assessment) => {
              const windQuality = getWindQuality(assessment.avgWindSpeed);
              return (
                <div key={assessment.id} className="comparison-card">
                  <button 
                    onClick={() => handleRemoveAssessment(assessment.id)}
                    className="remove-btn"
                    title="Remove"
                  >
                    ×
                  </button>
                  <div className="comparison-location">{assessment.coordinates}</div>
                  <div className="comparison-stats">
                    <div className="comp-stat">
                      <span className="comp-label">Wind</span>
                      <span className="comp-value" style={{ color: windQuality.color }}>
                        {assessment.avgWindSpeed.toFixed(1)} m/s
                      </span>
                    </div>
                    <div className="comp-stat">
                      <span className="comp-label">CF</span>
                      <span className="comp-value">{assessment.capacityFactor}%</span>
                    </div>
                    <div className="comp-stat">
                      <span className="comp-label">LCOE</span>
                      <span className="comp-value">${assessment.lcoeUSD}</span>
                    </div>
                    <div className="comp-stat">
                      <span className="comp-label">Grid</span>
                      <span className="comp-value">{assessment.gridDistance} km</span>
                    </div>
                    <div className="comp-stat">
                      <span className="comp-label">Feasibility</span>
                      <span className="comp-value" style={{ 
                        color: assessment.gridFeasibility === 'Excellent' ? '#10b981' : 
                               assessment.gridFeasibility === 'Good' ? '#3b82f6' :
                               assessment.gridFeasibility === 'Fair' ? '#f59e0b' : '#ef4444',
                        fontSize: '0.75rem'
                      }}>
                        {assessment.gridFeasibility}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="map-wrapper">
        <MapContainer
          center={[46.8625, 103.8467]}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <MapController onMapClick={debouncedMapClick} />
          
          <TileLayer
            url={
              activeLayer === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : activeLayer === 'terrain'
                ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution="© Map Data"
          />

          {filteredWindFarms.map((farm) => (
            <Marker key={farm.id} position={farm.position} icon={turbineIcon}>
              <Popup maxWidth={350}>
                <WindFarmPopup farm={farm} />
              </Popup>
            </Marker>
          ))}

          {selectedLocation && (
            <Marker position={selectedLocation.position} icon={userIcon}>
              <Popup maxWidth={400}>
                <AssessmentPopup 
                  location={selectedLocation} 
                  onSave={handleSaveAssessment}
                  isSaved={savedAssessments.some(a => a.id === selectedLocation.id)}
                />
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="spinner"></div>
              <p>Analyzing wind data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Attribution */}
      <footer className={`attribution ${uiVisible ? 'visible' : 'hidden'}`}>
        Wind data: Open-Meteo API | Click anywhere to assess
      </footer>
    </div>
  );
}

export default MongoliaWindMap;