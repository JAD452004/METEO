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
  const [weathData, setWeathData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now())
  const [searchHistory, setSearchHistory] = useState(() => JSON.parse(localStorage.getItem('meteo-history') || '[]'))
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('meteo-favorites') || '[]'))
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // --- FONCTIONS UTILITAIRES ---

  const formatLocalTime = (timestamp, timezone, options = {}) => {
    if (!timestamp) return '--:--'
    const date = new Date(timestamp * 1000)
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: timezone || 'UTC',
      ...options
    }).format(date)
  }

  const getWeatherInfo = (weatherCode, isDay = 1) => {
    const codes = {
      0: { description: 'Ciel dégagé', emoji: '☀️', icon: clear_icon },
      1: { description: 'Principalement dégagé', emoji: '🌤️', icon: clear_icon },
      2: { description: 'Partiellement nuageux', emoji: '⛅', icon: cloud_icon },
      3: { description: 'Nuageux', emoji: '☁️', icon: cloud_icon },
      45: { description: 'Brouillard', emoji: '🌫️', icon: cloud_icon },
      48: { description: 'Brouillard givrant', emoji: '🌫️', icon: cloud_icon },
      51: { description: 'Bruine légère', emoji: '🌦️', icon: drizzle_icon },
      53: { description: 'Bruine modérée', emoji: '🌦️', icon: drizzle_icon },
      55: { description: 'Bruine forte', emoji: '🌧️', icon: rain_icon },
      56: { description: 'Bruine verglaçante légère', emoji: '🌧️', icon: rain_icon },
      57: { description: 'Bruine verglaçante forte', emoji: '🌧️', icon: rain_icon },
      61: { description: 'Pluie légère', emoji: '🌦️', icon: rain_icon },
      63: { description: 'Pluie modérée', emoji: '🌧️', icon: rain_icon },
      65: { description: 'Pluie forte', emoji: '🌧️', icon: rain_icon },
      66: { description: 'Pluie verglaçante légère', emoji: '🌧️', icon: rain_icon },
      67: { description: 'Pluie verglaçante forte', emoji: '🌧️', icon: rain_icon },
      71: { description: 'Neige légère', emoji: '🌨️', icon: snow_icon },
      73: { description: 'Neige modérée', emoji: '❄️', icon: snow_icon },
      75: { description: 'Neige forte', emoji: '❄️', icon: snow_icon },
      77: { description: 'Grains de neige', emoji: '🌨️', icon: snow_icon },
      80: { description: 'Averses légères', emoji: '🌦️', icon: rain_icon },
      81: { description: 'Averses modérées', emoji: '🌧️', icon: rain_icon },
      82: { description: 'Averses fortes', emoji: '⛈️', icon: rain_icon },
      85: { description: 'Averses de neige légères', emoji: '🌨️', icon: snow_icon },
      86: { description: 'Averses de neige fortes', emoji: '❄️', icon: snow_icon },
      95: { description: 'Orage', emoji: '⛈️', icon: rain_icon },
      96: { description: 'Orage avec grêle', emoji: '⛈️', icon: rain_icon },
      99: { description: 'Orage avec grêle forte', emoji: '⛈️', icon: rain_icon }
    }

    const base = codes[weatherCode] || { 
      description: 'Météo inconnue', 
      emoji: '🌤️', 
      icon: clear_icon 
    }
    
    const iconSuffix = isDay ? 'd' : 'n'
    const codeNumber = Object.keys(codes).find(key => codes[key] === base) || '01'
    const iconCode = `${codeNumber}${iconSuffix}`
    
    return {
      ...base,
      iconCode: iconCode
    }
  }

  // --- GESTION DES FAVORIS ET HISTORIQUE ---

  const saveSearch = (city) => {
    if (!city) return
    const nextHistory = [city, ...searchHistory.filter(item => item.toLowerCase() !== city.toLowerCase())].slice(0, 6)
    setSearchHistory(nextHistory)
    localStorage.setItem('meteo-history', JSON.stringify(nextHistory))
  }

  const toggleFavorite = () => {
    if (!weathData) return
    const city = `${weathData.location}, ${weathData.country}`
    const exists = favorites.some(item => item.toLowerCase() === city.toLowerCase())
    const nextFavorites = exists
      ? favorites.filter(item => item.toLowerCase() !== city.toLowerCase())
      : [...favorites, city]
    setFavorites(nextFavorites)
    localStorage.setItem('meteo-favorites', JSON.stringify(nextFavorites))
  }

  // --- RECHERCHE ET MÉTÉO ---

  const search = async (city, coords = null) => {
    if (!city?.trim() && !coords) {
      setError('Veuillez entrer une ville')
      return
    }

    setLoading(true)
    setError('')
    setShowSuggestions(false)

    try {
      let lat, lon, cityName = '', countryName = ''

      if (coords) {
        lat = coords.lat
        lon = coords.lon
      } else {
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr`
        const geoResponse = await fetch(geoUrl)
        const geoData = await geoResponse.json()

        if (!geoData.results || geoData.results.length === 0) {
          throw new Error('Ville non trouvée')
        }

        const location = geoData.results[0]
        lat = location.latitude
        lon = location.longitude
        cityName = location.name || ''
        countryName = location.country || ''
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`
      
      const response = await fetch(weatherUrl)
      const data = await response.json()

      if (!data.current_weather) {
        throw new Error('Données météo indisponibles')
      }

      // Si on n'a pas le nom de la ville (géolocalisation)
      if (!cityName) {
        const reverseGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&count=1`
        const reverseResponse = await fetch(reverseGeoUrl)
        const reverseData = await reverseResponse.json()
        cityName = reverseData.results?.[0]?.name || 'Ville inconnue'
        countryName = reverseData.results?.[0]?.country || ''
      }

      const weatherCode = data.current_weather.weathercode || 0
      const isDay = data.current_weather.is_day || 1
      const weatherInfo = getWeatherInfo(weatherCode, isDay)

      // Construire l'objet météo avec des valeurs par défaut
      const currentWeather = {
        humidity: data.hourly?.relativehumidity_2m?.[0] ?? 0,
        windSpeed: Math.round(data.current_weather.windspeed ?? 0),
        temperature: Math.round(data.current_weather.temperature ?? 0),
        feelsLike: Math.round(data.hourly?.apparent_temperature?.[0] ?? data.current_weather.temperature ?? 0),
        pressure: 1013,
        visibility: 10,
        location: cityName || 'Ville inconnue',
        icon: weatherInfo.icon || clear_icon,
        emoji: weatherInfo.emoji || '🌤️',
        country: countryName || '',
        description: weatherInfo.description || 'Météo inconnue',
        iconCode: weatherInfo.iconCode || '01d',
        timezone: data.timezone_abbreviation || 'UTC',
        timezoneOffset: data.timezone_offset || 0,
        sunrise: data.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]).getTime() / 1000 : Math.floor(Date.now() / 1000),
        sunset: data.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]).getTime() / 1000 : Math.floor(Date.now() / 1000) + 43200,
        weatherCode: weatherCode,
        lat: lat,
        lon: lon
      }

      setWeathData(currentWeather)
      setForecastData(data)
      setSearchValue(`${cityName}, ${countryName}`)
      saveSearch(cityName)

    } catch (error) {
      console.error('Erreur de recherche:', error)
      setError(error.message || 'Erreur lors de la recherche')
      setWeathData(null)
      setForecastData(null)
    } finally {
      setLoading(false)
    }
  }

  // --- SUGGESTIONS ---

  const fetchSuggestions = async (query) => {
    if (!query?.trim() || query.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr`
      const response = await fetch(url)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const formattedSuggestions = data.results.map(city => ({
          name: city.name || '',
          country: city.country || '',
          state: city.admin1 || city.admin2 || '',
          lat: city.latitude,
          lon: city.longitude,
          display: `${city.name || ''}${city.admin1 ? `, ${city.admin1}` : ''}${city.country ? `, ${city.country}` : ''}`
        }))
        setSuggestions(formattedSuggestions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Erreur de suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // --- GESTIONNAIRES D'ÉVÉNEMENTS ---

  const handleInputChange = (e) => {
    const value = e.target.value
    setSearchValue(value)
    fetchSuggestions(value)
  }

  const handleSelectSuggestion = (city) => {
    if (!city) return
    setShowSuggestions(false)
    setSuggestions([])
    setSearchValue(city.display || city.name || '')
    search(city.name || '', { lat: city.lat, lon: city.lon })
  }

  const handleSearch = () => {
    const city = inputRef.current?.value || searchValue
    if (city?.trim()) {
      search(city)
    } else {
      setError('Veuillez entrer une ville')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0])
      } else {
        handleSearch()
      }
    }
  }

  const searchFromHistory = (city) => {
    if (city?.trim()) {
      setSearchValue(city)
      search(city)
    }
  }

  const locateUser = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas disponible sur cet appareil')
      return
    }

    setLoading(true)
    setError('')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          await search('', { lat: latitude, lon: longitude })
        } catch (error) {
          console.error('Erreur de géolocalisation:', error)
          setError(error.message || 'Impossible de trouver votre position')
          setLoading(false)
        }
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error)
        setError('Autorisation de localisation refusée')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // --- EFFETS ---

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        const isSuggestionItem = event.target.closest('.suggestion-item')
        if (!isSuggestionItem) {
          setShowSuggestions(false)
        }
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    search('Abidjan')
  }, [])

  useEffect(() => {
    if (!weathData) return

    const updateTime = () => {
      setCurrentTimestamp(Date.now())
      
      const now = new Date()
      const offset = weathData.timezoneOffset || 0
      const localTime = new Date(now.getTime() + offset * 1000)
      
      const formattedDate = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(localTime)

      const formattedTime = new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(localTime)

      setCurrentTime(`${formattedDate} à ${formattedTime}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [weathData])

  // --- PRÉPARATION DES DONNÉES POUR L'AFFICHAGE ---

  const isFavorite = weathData && favorites.some(
    item => item.toLowerCase() === `${weathData.location}, ${weathData.country}`.toLowerCase()
  )

  // Prévisions horaires (8 prochaines heures)
  const hourlyForecast = forecastData?.hourly?.time ? 
    forecastData.hourly.time.slice(0, 8).map((time, index) => ({
      dt: new Date(time).getTime() / 1000,
      temp: Math.round(forecastData.hourly.temperature_2m?.[index] ?? 0),
      weatherCode: forecastData.hourly.weathercode?.[index] ?? 0,
      description: getWeatherInfo(forecastData.hourly.weathercode?.[index] ?? 0, 1).description,
      icon: getWeatherInfo(forecastData.hourly.weathercode?.[index] ?? 0, 1).icon,
      pop: (forecastData.hourly.precipitation_probability?.[index] ?? 0) / 100
    })) : []

  // Prévisions quotidiennes (5 prochains jours)
  const dailyForecast = forecastData?.daily?.time ? 
    forecastData.daily.time.slice(0, 5).map((date, index) => ({
      date: new Date(date).getTime() / 1000,
      max: Math.round(forecastData.daily.temperature_2m_max?.[index] ?? 0),
      min: Math.round(forecastData.daily.temperature_2m_min?.[index] ?? 0),
      weatherCode: forecastData.daily.weathercode?.[index] ?? 0,
      description: getWeatherInfo(forecastData.daily.weathercode?.[index] ?? 0, 1).description,
      icon: getWeatherInfo(forecastData.daily.weathercode?.[index] ?? 0, 1).icon
    })) : []

  // Déterminer le moment de la journée
  const isDay = weathData ? 
    (() => {
      const now = Math.floor(Date.now() / 1000)
      const sunrise = weathData.sunrise || 0
      const sunset = weathData.sunset || 0
      return now >= sunrise && now < sunset
    })() : true

  const isSunset = weathData ? 
    (() => {
      const now = Math.floor(Date.now() / 1000)
      const sunset = weathData.sunset || 0
      const sunsetPeriod = 30 * 60
      return Math.abs(now - sunset) <= sunsetPeriod
    })() : false

  // --- RENDU ---

  return (
    <>
      <div
        className={`background-day ${isDay && !isSunset ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${terre_jour}")` }}
        aria-hidden="true"
      />
      <div
        className={`background-sunset ${isSunset ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${soleil_couchant}")` }}
        aria-hidden="true"
      />
      <div className="stars" />

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
                  if (searchValue?.length >= 2) {
                    fetchSuggestions(searchValue)
                  }
                }}
              />
              <button onClick={handleSearch} className="search-btn">
                <img src={search_icon} alt="search" />
              </button>
            </div>

            <div className="search-actions">
              <button type="button" onClick={locateUser} className="secondary-btn">
                📍 Ma position
              </button>

              {searchHistory.length > 0 && (
                <div className="quick-searches">
                  <span>Récentes</span>
                  {searchHistory.map(city => (
                    <button type="button" key={city} onClick={() => searchFromHistory(city)}>
                      {city}
                    </button>
                  ))}
                  <button 
                    type="button" 
                    className="clear-history" 
                    onClick={() => { 
                      setSearchHistory([])
                      localStorage.removeItem('meteo-history')
                    }}
                  >
                    Effacer
                  </button>
                </div>
              )}

              {favorites.length > 0 && (
                <div className="quick-searches favorites-list">
                  <span>Favoris</span>
                  {favorites.map(city => (
                    <button type="button" key={city} onClick={() => searchFromHistory(city)}>
                      {city} ★
                    </button>
                  ))}
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
                    <span className="city-name">{city.name || 'Ville'}</span>
                    {city.state && <span className="city-state">{city.state}</span>}
                    <span className="city-country">{city.country || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              <div className="loading-text">Chargement...</div>
            </div>
          ) : weathData ? (
            <>
              <div className="weather-main">
                <div className="weather-icon-container">
                  {(!isDay && weathData.iconCode?.startsWith('01')) ? (
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
                  <time>{currentTime || 'Chargement...'}</time>
                </div>

                <button 
                  type="button" 
                  className={`favorite-btn ${isFavorite ? 'active' : ''}`} 
                  onClick={toggleFavorite}
                >
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
                <div className="detail-card detail-card-text">
                  <span>Ressentie</span>
                  <p>{weathData.feelsLike}°C</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Pression</span>
                  <p>{weathData.pressure} hPa</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Visibilité</span>
                  <p>{weathData.visibility} km</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Lever / coucher</span>
                  <p>
                    {formatLocalTime(weathData.sunrise, weathData.timezone, { hour: '2-digit', minute: '2-digit' })} / 
                    {formatLocalTime(weathData.sunset, weathData.timezone, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {hourlyForecast.length > 0 && (
                <section className="forecast-section">
                  <h2>Prévisions horaires</h2>
                  <div className="forecast-scroll">
                    {hourlyForecast.map((item, index) => (
                      <div className="forecast-item" key={index}>
                        <span>{formatLocalTime(item.dt, weathData.timezone, { hour: '2-digit', minute: '2-digit' })}</span>
                        <img src={item.icon} alt={item.description} />
                        <strong>{item.temp}°</strong>
                        {item.pop > 0 && <small>☂ {Math.round(item.pop * 100)}%</small>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {dailyForecast.length > 0 && (
                <section className="forecast-section">
                  <h2>Les prochains jours</h2>
                  <div className="daily-forecast">
                    {dailyForecast.map((day, index) => (
                      <div className="daily-item" key={index}>
                        <span>
                          {formatLocalTime(day.date, weathData.timezone, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <img src={day.icon} alt={day.description} />
                        <strong>{day.max}° / {day.min}°</strong>
                        <small>{day.description}</small>
                      </div>
                    ))}
                  </div>
                </section>
              )}
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