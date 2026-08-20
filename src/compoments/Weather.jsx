import React, { useEffect, useState, useRef } from 'react'
import './Weather.css'
import search_icon from '../assets/search.png'
import clear_icon from '../assets/clear.png'
import cloud_icon from '../assets/cloud.png'
import drizzle_icon from '../assets/drizzle.png'
import rain_icon from '../assets/rain.png'
import snow_icon from '../assets/snow.png'
import wind_icon from '../assets/wind.png'
import humidity_icon from '../assets/humidity.png'
import terre_jour from '../assets/espace/jour terre.jpg'
import soleil_couchant from '../assets/espace/soleil couchan.jpg'
import ilimi_group_logo from '../assets/espace/ilimi_group.png'

const Meteo = () => {
  const [weathData, setWeathData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  const [searchHistory, setSearchHistory] = useState(() => JSON.parse(localStorage.getItem('meteo-history') || '[]'));
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('meteo-favorites') || '[]'));
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const formatLocalTime = (timestamp, timezone, options = {}) => {
    const localDate = new Date((timestamp + timezone) * 1000);
    return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(localDate);
  };

  const saveSearch = (city) => {
    const nextHistory = [city, ...searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase())].slice(0, 6);
    setSearchHistory(nextHistory);
    localStorage.setItem('meteo-history', JSON.stringify(nextHistory));
  };

  const toggleFavorite = () => {
    if (!weathData) return;
    const city = `${weathData.location}, ${weathData.country}`;
    const exists = favorites.some(item => item.toLowerCase() === city.toLowerCase());
    const nextFavorites = exists
      ? favorites.filter(item => item.toLowerCase() !== city.toLowerCase())
      : [...favorites, city];
    setFavorites(nextFavorites);
    localStorage.setItem('meteo-favorites', JSON.stringify(nextFavorites));
  };

  const getWeatherIcon = (iconCode) => {
    const icons = {
      '01d': { emoji: '', icon: clear_icon },
      '02d': { emoji: '', icon: cloud_icon },
      '03d': { emoji: '', icon: cloud_icon },
      '04d': { emoji: '', icon: drizzle_icon },
      '09d': { emoji: '', icon: rain_icon },
      '10d': { emoji: '', icon: rain_icon },
      '11d': { emoji: '', icon: rain_icon },
      '13d': { emoji: '', icon: snow_icon },
      '50d': { emoji: '', icon: cloud_icon },
      '01n': { emoji: '', icon: clear_icon },
      '02n': { emoji: '', icon: cloud_icon },
      '03n': { emoji: '', icon: cloud_icon },
      '04n': { emoji: '', icon: drizzle_icon },
      '09n': { emoji: '', icon: rain_icon },
      '10n': { emoji: '', icon: rain_icon },
      '11n': { emoji: '', icon: rain_icon },
      '13n': { emoji: '', icon: snow_icon },
      '50n': { emoji: '', icon: cloud_icon },
    };
    return icons[iconCode] || { emoji: '🌤️', icon: clear_icon };
  };

  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${import.meta.env.VITE_APP_ID}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const formattedSuggestions = data.map(city => ({
          name: city.name,
          country: city.country,
          state: city.state || '',
          display: `${city.name}${city.state ? `, ${city.state}` : ''}, ${city.country}`
        }));
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Erreur de suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (city) => {
    setSearchValue(city.display);
    setShowSuggestions(false);
    setSuggestions([]);
    search(city.name);
  };

  const search = async (city, coordinates = null) => {
    if (!city.trim()) {
      setError('Veuillez entrer une ville');
      return;
    }

    setLoading(true);
    setError('');
    setShowSuggestions(false);
    
    try {
      const locationQuery = coordinates
        ? `lat=${coordinates.lat}&lon=${coordinates.lon}`
        : `q=${encodeURIComponent(city)}`;
      const url = `https://api.openweathermap.org/data/2.5/weather?${locationQuery}&units=metric&appid=${import.meta.env.VITE_APP_ID}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${locationQuery}&units=metric&appid=${import.meta.env.VITE_APP_ID}`;
      const [response, forecastResponse] = await Promise.all([fetch(url), fetch(forecastUrl)]);
      
      if (!response.ok) {
        throw new Error('Ville non trouvée');
      }
      if (!forecastResponse.ok) {
        throw new Error('Prévisions indisponibles');
      }
      
      const data = await response.json();
      const forecast = await forecastResponse.json();
      const iconCode = data.weather[0].icon;
      const weatherInfo = getWeatherIcon(iconCode);
      const currentWeather = {
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed),
        temperature: Math.floor(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        visibility: Math.round((data.visibility || 0) / 100) / 10,
        location: data.name,
        icon: weatherInfo.icon,
        emoji: weatherInfo.emoji,
        country: data.sys.country,
        description: data.weather[0].description,
        iconCode: iconCode,
        timezone: data.timezone,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset
      };
      setWeathData(currentWeather);
      setForecastData(forecast);
      setSearchValue(`${data.name}, ${data.sys.country}`);
      saveSearch(data.name);
    } catch (error) {
      setError(error.message || 'Erreur lors de la recherche');
      setWeathData(null);
    } finally {
      setLoading(false);
    }
  };

  const searchFromHistory = (city) => {
    setSearchValue(city);
    search(city);
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n’est pas disponible sur cet appareil');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${coords.latitude}&lon=${coords.longitude}&limit=1&appid=${import.meta.env.VITE_APP_ID}`;
        const response = await fetch(url);
        const data = await response.json();
        if (!data[0]) throw new Error('Position inconnue');
        await search(data[0].name, { lat: coords.latitude, lon: coords.longitude });
      } catch (locationError) {
        setError(locationError.message || 'Impossible de trouver votre ville');
        setLoading(false);
      }
    }, () => {
      setError('Autorisation de localisation refusée');
      setLoading(false);
    });
  };

  const handleSearch = () => {
    const city = inputRef.current.value;
    search(city);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        handleSearch();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    search("Abidjan");
  }, []);

  useEffect(() => {
    const updateTime = () => {
      if (!weathData) return;

      setCurrentTimestamp(Date.now());
      const localTimestamp = Date.now() + (weathData.timezone * 1000);
      const localDate = new Date(localTimestamp);
      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'UTC',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(localDate);
      const formattedTime = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(localDate);

      setCurrentTime(`${formattedDate} à ${formattedTime}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [weathData]);

  const sunsetTimestamp = weathData ? weathData.sunset * 1000 : 0;
  const sunsetPeriod = 30 * 60 * 1000;
  const isSunset = weathData
    ? Math.abs(currentTimestamp - sunsetTimestamp) <= sunsetPeriod
    : false;
  const isDay = weathData
    ? currentTimestamp >= weathData.sunrise * 1000 && currentTimestamp < sunsetTimestamp - sunsetPeriod
    : false;

  const isFavorite = weathData && favorites.some(item => item.toLowerCase() === `${weathData.location}, ${weathData.country}`.toLowerCase());
  const dailyForecast = forecastData
    ? Object.values(forecastData.list.reduce((days, item) => {
        const date = item.dt_txt.split(' ')[0];
        if (!days[date]) days[date] = [];
        days[date].push(item);
        return days;
      }, {})).slice(1, 6).map(day => ({
        date: day[0].dt,
        min: Math.round(Math.min(...day.map(item => item.main.temp_min))),
        max: Math.round(Math.max(...day.map(item => item.main.temp_max))),
        description: day[Math.floor(day.length / 2)].weather[0].description,
        icon: getWeatherIcon(day[Math.floor(day.length / 2)].weather[0].icon).icon
      }))
    : [];
  const hourlyForecast = forecastData ? forecastData.list.slice(0, 8) : [];

  return (
    <>
      <div
        className={`background-day ${isDay ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${terre_jour}")` }}
        aria-hidden="true"
      ></div>
      <div
        className={`background-sunset ${isSunset ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${soleil_couchant}")` }}
        aria-hidden="true"
      ></div>
      {/* Étoiles scintillantes */}
      <div className="stars"></div>
      
      <div className='weather-container'>
        <div className='weather'>
          <div className="brand-logo">
            <img src={ilimi_group_logo} alt="Logo Ilimi Group" />
          </div>
          <div className="search-wrapper" ref={suggestionsRef}>
            <div className="search-bar">
              <input 
                ref={inputRef}
                type="text" 
                placeholder='Rechercher une ville...'
                value={searchValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  if (searchValue.length >= 2) {
                    fetchSuggestions(searchValue);
                  }
                }}
              />
              <button onClick={handleSearch} className="search-btn">
                <img src={search_icon} alt="search" />
              </button>
            </div>

            <div className="search-actions">
              <button type="button" onClick={locateUser} className="secondary-btn">⌖ Ma position</button>
              {searchHistory.length > 0 && (
                <div className="quick-searches">
                  <span>Récentes</span>
                  {searchHistory.map(city => <button type="button" key={city} onClick={() => searchFromHistory(city)}>{city}</button>)}
                  <button type="button" className="clear-history" onClick={() => { setSearchHistory([]); localStorage.removeItem('meteo-history'); }}>Effacer</button>
                </div>
              )}
              {favorites.length > 0 && (
                <div className="quick-searches favorites-list">
                  <span>Favoris</span>
                  {favorites.map(city => <button type="button" key={city} onClick={() => searchFromHistory(city)}>{city} ★</button>)}
                </div>
              )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="suggestions-list">
                {suggestions.map((city, index) => (
                  <div 
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSelectSuggestion(city)}
                  >
                    <span className="city-name">{city.name}</span>
                    {city.state && <span className="city-state">{city.state}</span>}
                    <span className="city-country">{city.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <div className="loading-text">Chargement...</div>
            </div>
          ) : weathData ? (
            <>
              <div className="weather-main">
                <div className="weather-icon-container">
                  {(!isDay && !isSunset && weathData.iconCode.startsWith('01')) ? (
                    <div className="night-icon" aria-label="Nuit">🌙</div>
                  ) : (
                    <img src={weathData.icon} alt="weather" className='weather-icon' />
                  )}
                  <div className="weather-emoji">{weathData.emoji}</div>
                </div>
                <p className='temperature'>
                  {weathData.temperature}<span>°C</span>
                </p>
                <p className='description'>{weathData.description}</p>
                <p className='location'>
                  📍 {weathData.location}, {weathData.country}
                  <span className="time-indicator">
                    {isSunset ? ' 🌅' : isDay ? ' ☀️' : ' 🌙'}
                  </span>
                </p>
                <div className='time-display'>
                  <span className='time-label'>Heure locale</span>
                  <time>{currentTime}</time>
                </div>
                <button type="button" className={`favorite-btn ${isFavorite ? 'active' : ''}`} onClick={toggleFavorite}>
                  {isFavorite ? '★ Ville favorite' : '☆ Ajouter aux favoris'}
                </button>
              </div>
              
              <div className="weather-details">
                <div className="detail-card">
                  <img src={humidity_icon} alt="humidity" />
                  <div>
                    <p>{weathData.humidity}%</p>
                    <span>Humidité</span>
                  </div>
                </div>
                <div className="detail-card">
                  <img src={wind_icon} alt="wind" />
                  <div>
                    <p>{weathData.windSpeed} km/h</p>
                    <span>Vent</span>
                  </div>
                </div>
                <div className="detail-card detail-card-text"><span>Ressentie</span><p>{weathData.feelsLike}°C</p></div>
                <div className="detail-card detail-card-text"><span>Pression</span><p>{weathData.pressure} hPa</p></div>
                <div className="detail-card detail-card-text"><span>Visibilité</span><p>{weathData.visibility} km</p></div>
                <div className="detail-card detail-card-text"><span>Lever / coucher</span><p>{formatLocalTime(weathData.sunrise, weathData.timezone, { hour: '2-digit', minute: '2-digit' })} / {formatLocalTime(weathData.sunset, weathData.timezone, { hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>

              <section className="forecast-section">
                <h2>Prévisions horaires</h2>
                <div className="forecast-scroll">
                  {hourlyForecast.map(item => (
                    <div className="forecast-item" key={item.dt}>
                      <span>{formatLocalTime(item.dt, forecastData.city.timezone, { hour: '2-digit', minute: '2-digit' })}</span>
                      <img src={getWeatherIcon(item.weather[0].icon).icon} alt={item.weather[0].description} />
                      <strong>{Math.round(item.main.temp)}°</strong>
                      {item.pop > 0 && <small>☂ {Math.round(item.pop * 100)}%</small>}
                    </div>
                  ))}
                </div>
              </section>

              <section className="forecast-section">
                <h2>Les prochains jours</h2>
                <div className="daily-forecast">
                  {dailyForecast.map(day => (
                    <div className="daily-item" key={day.date}>
                      <span>{formatLocalTime(day.date, forecastData.city.timezone, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <img src={day.icon} alt={day.description} />
                      <strong>{day.max}° / {day.min}°</strong>
                      <small>{day.description}</small>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="no-data">Aucune donnée disponible</div>
          )}
        </div>
      </div>
    </>
  )
}

export default Meteo