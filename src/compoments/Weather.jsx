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
import ilimi_group_logo from '../assets/espace/ilimi_group.png'

const Meteo = () => {
  const [weathData, setWeathData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

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

  const search = async (city) => {
    if (!city.trim()) {
      setError('Veuillez entrer une ville');
      return;
    }

    setLoading(true);
    setError('');
    setShowSuggestions(false);
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${import.meta.env.VITE_APP_ID}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Ville non trouvée');
      }
      
      const data = await response.json();
      const iconCode = data.weather[0].icon;
      const weatherInfo = getWeatherIcon(iconCode);
      setWeathData({
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed),
        temperature: Math.floor(data.main.temp),
        location: data.name,
        icon: weatherInfo.icon,
        emoji: weatherInfo.emoji,
        country: data.sys.country,
        description: data.weather[0].description,
        iconCode: iconCode,
        timezone: data.timezone,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset
      });
    } catch (error) {
      setError(error.message || 'Erreur lors de la recherche');
      setWeathData(null);
    } finally {
      setLoading(false);
    }
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

  const isDay = weathData
    ? currentTimestamp >= weathData.sunrise * 1000 && currentTimestamp < weathData.sunset * 1000
    : false;

  return (
    <>
      <div
        className={`background-day ${isDay ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${terre_jour}")` }}
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
                  {(!isDay && weathData.iconCode.startsWith('01')) ? (
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
                    {isDay ? ' ☀️' : ' 🌙'}
                  </span>
                </p>
                <div className='time-display'>
                  <span className='time-label'>Heure locale</span>
                  <time>{currentTime}</time>
                </div>
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
              </div>
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