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
  const [donneesMeteo, setDonneesMeteo] = useState(null)
  const [donneesPrevisions, setDonneesPrevisions] = useState(null)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [afficherSuggestions, setAfficherSuggestions] = useState(false)
  const [valeurRecherche, setValeurRecherche] = useState('')
  const [heureActuelle, setHeureActuelle] = useState('')
  const [historiqueRecherches, setHistoriqueRecherches] = useState(() => JSON.parse(localStorage.getItem('meteo-history') || '[]'))
  const [favoris, setFavoris] = useState(() => JSON.parse(localStorage.getItem('meteo-favorites') || '[]'))
  const refChampSaisie = useRef(null)
  const refSuggestions = useRef(null)

  // --- FONCTIONS UTILITAIRES ---

  const formaterHeureLocale = (timestamp, fuseauHoraire, options = {}) => {
    if (!timestamp) return '--:--'
    const date = new Date(timestamp * 1000)
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: fuseauHoraire || 'UTC',
      ...options
    }).format(date)
  }

  const obtenirInfosMeteo = (codeMeteo, estJour = 1) => {
    const codes = {
      0: { description: 'Ciel dégagé', emoji: '☀️', icone: clear_icon },
      1: { description: 'Principalement dégagé', emoji: '🌤️', icone: clear_icon },
      2: { description: 'Partiellement nuageux', emoji: '⛅', icone: cloud_icon },
      3: { description: 'Nuageux', emoji: '☁️', icone: cloud_icon },
      45: { description: 'Brouillard', emoji: '🌫️', icone: cloud_icon },
      48: { description: 'Brouillard givrant', emoji: '🌫️', icone: cloud_icon },
      51: { description: 'Bruine légère', emoji: '🌦️', icone: drizzle_icon },
      53: { description: 'Bruine modérée', emoji: '🌦️', icone: drizzle_icon },
      55: { description: 'Bruine forte', emoji: '🌧️', icone: rain_icon },
      56: { description: 'Bruine verglaçante légère', emoji: '🌧️', icone: rain_icon },
      57: { description: 'Bruine verglaçante forte', emoji: '🌧️', icone: rain_icon },
      61: { description: 'Pluie légère', emoji: '🌦️', icone: rain_icon },
      63: { description: 'Pluie modérée', emoji: '🌧️', icone: rain_icon },
      65: { description: 'Pluie forte', emoji: '🌧️', icone: rain_icon },
      66: { description: 'Pluie verglaçante légère', emoji: '🌧️', icone: rain_icon },
      67: { description: 'Pluie verglaçante forte', emoji: '🌧️', icone: rain_icon },
      71: { description: 'Neige légère', emoji: '🌨️', icone: snow_icon },
      73: { description: 'Neige modérée', emoji: '❄️', icone: snow_icon },
      75: { description: 'Neige forte', emoji: '❄️', icone: snow_icon },
      77: { description: 'Grains de neige', emoji: '🌨️', icone: snow_icon },
      80: { description: 'Averses légères', emoji: '🌦️', icone: rain_icon },
      81: { description: 'Averses modérées', emoji: '🌧️', icone: rain_icon },
      82: { description: 'Averses fortes', emoji: '⛈️', icone: rain_icon },
      85: { description: 'Averses de neige légères', emoji: '🌨️', icone: snow_icon },
      86: { description: 'Averses de neige fortes', emoji: '❄️', icone: snow_icon },
      95: { description: 'Orage', emoji: '⛈️', icone: rain_icon },
      96: { description: 'Orage avec grêle', emoji: '⛈️', icone: rain_icon },
      99: { description: 'Orage avec grêle forte', emoji: '⛈️', icone: rain_icon }
    }

    const base = codes[codeMeteo] || { 
      description: 'Météo inconnue', 
      emoji: '🌤️', 
      icone: clear_icon 
    }
    
    const suffixeJour = estJour ? 'd' : 'n'
    const numeroCode = Object.keys(codes).find(key => codes[key] === base) || '01'
    const codeIcone = `${numeroCode}${suffixeJour}`
    
    return {
      ...base,
      codeIcone: codeIcone
    }
  }

  // --- GESTION DES FAVORIS ET HISTORIQUE ---

  const enregistrerRecherche = (ville) => {
    if (!ville) return
    const nouvelHistorique = [ville, ...historiqueRecherches.filter(item => item.toLowerCase() !== ville.toLowerCase())].slice(0, 6)
    setHistoriqueRecherches(nouvelHistorique)
    localStorage.setItem('meteo-history', JSON.stringify(nouvelHistorique))
  }

  const basculerFavori = () => {
    if (!donneesMeteo) return
    const ville = `${donneesMeteo.localisation}, ${donneesMeteo.pays}`
    const existe = favoris.some(item => item.toLowerCase() === ville.toLowerCase())
    const nouveauxFavoris = existe
      ? favoris.filter(item => item.toLowerCase() !== ville.toLowerCase())
      : [...favoris, ville]
    setFavoris(nouveauxFavoris)
    localStorage.setItem('meteo-favorites', JSON.stringify(nouveauxFavoris))
  }

  // --- RECHERCHE ET MÉTÉO ---

  const rechercher = async (ville, coordonnees = null, infoVille = null) => {
    if (!ville?.trim() && !coordonnees) {
      setErreur('Veuillez entrer une ville')
      setChargement(false)
      return
    }

    setChargement(true)
    setErreur('')
    setAfficherSuggestions(false)

    try {
      let lat, lon, nomVille = '', nomPays = ''

      if (coordonnees) {
        lat = coordonnees.lat
        lon = coordonnees.lon
        // Si on a les infos de la ville, les utiliser
        if (infoVille) {
          nomVille = infoVille.nom || ''
          nomPays = infoVille.pays || ''
        }
      } else {
        const urlGeo = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ville)}&count=1&language=fr`
        const reponseGeo = await fetch(urlGeo)
        const donneesGeo = await reponseGeo.json()

        if (!donneesGeo.results || donneesGeo.results.length === 0) {
          throw new Error('Ville non trouvée')
        }

        const emplacement = donneesGeo.results[0]
        lat = emplacement.latitude
        lon = emplacement.longitude
        nomVille = emplacement.name || ''
        nomPays = emplacement.country || ''
      }

      const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`
      
      const reponse = await fetch(urlMeteo)
      const donnees = await reponse.json()

      if (!donnees.current_weather) {
        throw new Error('Données météo indisponibles')
      }

      // Si on n'a pas le nom de la ville (géolocalisation), utiliser "Ma position"
      if (!nomVille) {
        nomVille = 'Ma position'
        nomPays = donnees.timezone || ''
      }

      const codeMeteo = donnees.current_weather.weathercode || 0
      const estJour = donnees.current_weather.is_day || 1
      const infosMeteo = obtenirInfosMeteo(codeMeteo, estJour)

      // Construire l'objet météo avec des valeurs par défaut
      const meteoActuelle = {
        humidite: donnees.hourly?.relativehumidity_2m?.[0] ?? 0,
        vitesseVent: Math.round(donnees.current_weather.windspeed ?? 0),
        temperature: Math.round(donnees.current_weather.temperature ?? 0),
        ressenti: Math.round(donnees.hourly?.apparent_temperature?.[0] ?? donnees.current_weather.temperature ?? 0),
        pression: 1013,
        visibilite: 10,
        localisation: nomVille || 'Ville inconnue',
        icone: infosMeteo.icone || clear_icon,
        emoji: infosMeteo.emoji || '🌤️',
        pays: nomPays || '',
        description: infosMeteo.description || 'Météo inconnue',
        codeIcone: infosMeteo.codeIcone || '01d',
        fuseauHoraire: donnees.timezone || 'UTC',
        decalageFuseau: donnees.timezone_offset || 0,
        leverSoleil: donnees.daily?.sunrise?.[0] ? new Date(donnees.daily.sunrise[0]).getTime() / 1000 : Math.floor(Date.now() / 1000),
        coucherSoleil: donnees.daily?.sunset?.[0] ? new Date(donnees.daily.sunset[0]).getTime() / 1000 : Math.floor(Date.now() / 1000) + 43200,
        codeMeteo: codeMeteo,
        lat: lat,
        lon: lon
      }

      setDonneesMeteo(meteoActuelle)
      setDonneesPrevisions(donnees)
      setValeurRecherche(`${nomVille}, ${nomPays}`)
      enregistrerRecherche(nomVille)

    } catch (erreur) {
      console.error('Erreur de recherche:', erreur)
      setErreur(erreur.message || 'Erreur lors de la recherche')
      setDonneesMeteo(null)
      setDonneesPrevisions(null)
    } finally {
      setChargement(false)
    }
  }

  // --- SUGGESTIONS ---

  const rechercherSuggestions = async (requete) => {
    if (!requete?.trim() || requete.length < 2) {
      setSuggestions([])
      setAfficherSuggestions(false)
      return
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(requete)}&count=5&language=fr`
      const reponse = await fetch(url)
      const donnees = await reponse.json()

      if (donnees.results && donnees.results.length > 0) {
        const suggestionsFormatees = donnees.results.map(ville => ({
          nom: ville.name || '',
          pays: ville.country || '',
          region: ville.admin1 || ville.admin2 || '',
          lat: ville.latitude,
          lon: ville.longitude,
          affichage: `${ville.name || ''}${ville.admin1 ? `, ${ville.admin1}` : ''}${ville.country ? `, ${ville.country}` : ''}`
        }))
        setSuggestions(suggestionsFormatees)
        setAfficherSuggestions(true)
      } else {
        setSuggestions([])
        setAfficherSuggestions(false)
      }
    } catch (erreur) {
      console.error('Erreur de suggestions:', erreur)
      setSuggestions([])
      setAfficherSuggestions(false)
    }
  }

  // --- GESTIONNAIRES D'ÉVÉNEMENTS ---

  const gererChangementSaisie = (e) => {
    const valeur = e.target.value
    setValeurRecherche(valeur)
    rechercherSuggestions(valeur)
  }

  const gererSelectionSuggestion = (ville) => {
    if (!ville) return
    setAfficherSuggestions(false)
    setSuggestions([])
    setValeurRecherche(ville.affichage || ville.nom || '')
    rechercher(ville.nom || '', { lat: ville.lat, lon: ville.lon }, { nom: ville.nom, pays: ville.pays })
  }

  const gererRecherche = () => {
    const ville = refChampSaisie.current?.value || valeurRecherche
    if (ville?.trim()) {
      rechercher(ville)
    } else {
      setErreur('Veuillez entrer une ville')
    }
  }

  const gererToucheEntree = (e) => {
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        gererSelectionSuggestion(suggestions[0])
      } else {
        gererRecherche()
      }
    }
  }

  const rechercherDepuisHistorique = (ville) => {
    if (ville?.trim()) {
      setValeurRecherche(ville)
      rechercher(ville)
    }
  }

  const localiserUtilisateur = () => {
    if (!navigator.geolocation) {
      setErreur('La géolocalisation n\'est pas disponible sur cet appareil')
      return
    }

    setChargement(true)
    setErreur('')
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          await rechercher('', { lat: latitude, lon: longitude })
        } catch (erreur) {
          console.error('Erreur de géolocalisation:', erreur)
          setErreur(erreur.message || 'Impossible de trouver votre position')
          setChargement(false)
        }
      },
      (erreur) => {
        console.error('Erreur de géolocalisation:', erreur)
        setErreur('Autorisation de localisation refusée')
        setChargement(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // --- EFFETS ---

  useEffect(() => {
    const gererClicExterieur = (evenement) => {
      if (refSuggestions.current && !refSuggestions.current.contains(evenement.target)) {
        const estElementSuggestion = evenement.target.closest('.suggestion-item')
        if (!estElementSuggestion) {
          setAfficherSuggestions(false)
        }
      }
    }
    
    document.addEventListener('mousedown', gererClicExterieur)
    return () => document.removeEventListener('mousedown', gererClicExterieur)
  }, [])

  useEffect(() => {
    rechercher('Abidjan')
  }, [])

  useEffect(() => {
    if (!donneesMeteo) return

    const mettreAJourHeure = () => {
      const maintenant = new Date()
      
      const dateFormatee = new Intl.DateTimeFormat('fr-FR', {
        timeZone: donneesMeteo.fuseauHoraire || 'UTC',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }).format(maintenant)

      const heureFormatee = new Intl.DateTimeFormat('fr-FR', {
        timeZone: donneesMeteo.fuseauHoraire || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(maintenant)

      setHeureActuelle(`${dateFormatee} à ${heureFormatee}`)
    }

    mettreAJourHeure()
    const intervalle = setInterval(mettreAJourHeure, 1000)
    return () => clearInterval(intervalle)
  }, [donneesMeteo])

  // --- PRÉPARATION DES DONNÉES POUR L'AFFICHAGE ---

  const estFavori = donneesMeteo && favoris.some(
    item => item.toLowerCase() === `${donneesMeteo.localisation}, ${donneesMeteo.pays}`.toLowerCase()
  )

  // Prévisions horaires (8 prochaines heures)
  const previsionsHoraire = donneesPrevisions?.hourly?.time ? 
    donneesPrevisions.hourly.time.slice(0, 8).map((temps, index) => ({
      horodatage: new Date(temps).getTime() / 1000,
      temperature: Math.round(donneesPrevisions.hourly.temperature_2m?.[index] ?? 0),
      codeMeteo: donneesPrevisions.hourly.weathercode?.[index] ?? 0,
      description: obtenirInfosMeteo(donneesPrevisions.hourly.weathercode?.[index] ?? 0, 1).description,
      icone: obtenirInfosMeteo(donneesPrevisions.hourly.weathercode?.[index] ?? 0, 1).icone,
      probabilitePluie: (donneesPrevisions.hourly.precipitation_probability?.[index] ?? 0) / 100
    })) : []

  // Prévisions quotidiennes (5 prochains jours)
  const previsionsQuotidiennes = donneesPrevisions?.daily?.time ? 
    donneesPrevisions.daily.time.slice(0, 5).map((date, index) => ({
      date: new Date(date).getTime() / 1000,
      max: Math.round(donneesPrevisions.daily.temperature_2m_max?.[index] ?? 0),
      min: Math.round(donneesPrevisions.daily.temperature_2m_min?.[index] ?? 0),
      codeMeteo: donneesPrevisions.daily.weathercode?.[index] ?? 0,
      description: obtenirInfosMeteo(donneesPrevisions.daily.weathercode?.[index] ?? 0, 1).description,
      icone: obtenirInfosMeteo(donneesPrevisions.daily.weathercode?.[index] ?? 0, 1).icone
    })) : []

  // Déterminer le moment de la journée
  const estJour = donneesMeteo ? 
    (() => {
      const maintenant = Math.floor(Date.now() / 1000)
      const lever = donneesMeteo.leverSoleil || 0
      const coucher = donneesMeteo.coucherSoleil || 0
      return maintenant >= lever && maintenant < coucher
    })() : true

  const estCoucherSoleil = donneesMeteo ? 
    (() => {
      const maintenant = Math.floor(Date.now() / 1000)
      const coucher = donneesMeteo.coucherSoleil || 0
      const periodeCoucher = 30 * 60
      return Math.abs(maintenant - coucher) <= periodeCoucher
    })() : false

  // --- RENDU ---

  return (
    <>
      <div
        className={`background-day ${estJour && !estCoucherSoleil ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${terre_jour}")` }}
        aria-hidden="true"
      />
      <div
        className={`background-sunset ${estCoucherSoleil ? 'visible' : ''}`}
        style={{ backgroundImage: `url("${soleil_couchant}")` }}
        aria-hidden="true"
      />
      <div className="stars" />

      <div className='weather-container'>
        <div className='weather'>
          <div className="brand-logo">
            <img src={ilimi_group_logo} alt="Logo Ilimi Group" />
          </div>

          <div className="search-wrapper" ref={refSuggestions}>
            <div className="search-bar">
              <input
                ref={refChampSaisie}
                type="text"
                placeholder='Rechercher une ville...'
                value={valeurRecherche}
                onChange={gererChangementSaisie}
                onKeyDown={gererToucheEntree}
                onFocus={() => {
                  if (valeurRecherche?.length >= 2) {
                    rechercherSuggestions(valeurRecherche)
                  }
                }}
              />
              <button onClick={gererRecherche} className="search-btn">
                <img src={search_icon} alt="Rechercher" />
              </button>
            </div>

            <div className="search-actions">
              <button type="button" onClick={localiserUtilisateur} className="secondary-btn">
                📍 Ma position
              </button>

              {historiqueRecherches.length > 0 && (
                <div className="quick-searches">
                  <span>Récentes</span>
                  {historiqueRecherches.map(ville => (
                    <button type="button" key={ville} onClick={() => rechercherDepuisHistorique(ville)}>
                      {ville}
                    </button>
                  ))}
                  <button 
                    type="button" 
                    className="clear-history" 
                    onClick={() => { 
                      setHistoriqueRecherches([])
                      localStorage.removeItem('meteo-history')
                    }}
                  >
                    Effacer
                  </button>
                </div>
              )}

              {favoris.length > 0 && (
                <div className="quick-searches favorites-list">
                  <span>Favoris</span>
                  {favoris.map(ville => (
                    <button type="button" key={ville} onClick={() => rechercherDepuisHistorique(ville)}>
                      {ville} ★
                    </button>
                  ))}
                </div>
              )}
            </div>

            {afficherSuggestions && suggestions.length > 0 && (
              <div className="suggestions-list">
                {suggestions.map((ville, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => gererSelectionSuggestion(ville)}
                  >
                    <span className="city-name">{ville.nom || 'Ville'}</span>
                    {ville.region && <span className="city-state">{ville.region}</span>}
                    <span className="city-country">{ville.pays || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {erreur && <div className="error-message">{erreur}</div>}

          {chargement ? (
            <div className="loading">
              <div className="loading-spinner" />
              <div className="loading-text">Chargement...</div>
            </div>
          ) : donneesMeteo ? (
            <>
              <div className="weather-main">
                <div className="weather-icon-container">
                  {(!estJour && donneesMeteo.codeIcone?.startsWith('01')) ? (
                    <div className="night-icon" aria-label="Nuit">🌙</div>
                  ) : (
                    <img src={donneesMeteo.icone} alt="Météo" className='weather-icon' />
                  )}
                  <div className="weather-emoji">{donneesMeteo.emoji}</div>
                </div>

                <p className='temperature'>
                  {donneesMeteo.temperature}<span>°C</span>
                </p>
                <p className='description'>{donneesMeteo.description}</p>
                <p className='location'>
                  📍 {donneesMeteo.localisation}, {donneesMeteo.pays}
                  <span className="time-indicator">
                    {estCoucherSoleil ? ' 🌅' : estJour ? ' ☀️' : ' 🌙'}
                  </span>
                </p>

                <div className='time-display'>
                  <span className='time-label'>Heure locale</span>
                  <time>{heureActuelle || 'Chargement...'}</time>
                </div>

                <button 
                  type="button" 
                  className={`favorite-btn ${estFavori ? 'active' : ''}`} 
                  onClick={basculerFavori}
                >
                  {estFavori ? '★ Ville favorite' : '☆ Ajouter aux favoris'}
                </button>
              </div>

              <div className="weather-details">
                <div className="detail-card">
                  <img src={humidity_icon} alt="Humidité" />
                  <div>
                    <p>{donneesMeteo.humidite}%</p>
                    <span>Humidité</span>
                  </div>
                </div>
                <div className="detail-card">
                  <img src={wind_icon} alt="Vent" />
                  <div>
                    <p>{donneesMeteo.vitesseVent} km/h</p>
                    <span>Vent</span>
                  </div>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Ressentie</span>
                  <p>{donneesMeteo.ressenti}°C</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Pression</span>
                  <p>{donneesMeteo.pression} hPa</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Visibilité</span>
                  <p>{donneesMeteo.visibilite} km</p>
                </div>
                <div className="detail-card detail-card-text">
                  <span>Lever / coucher</span>
                  <p>
                    {formaterHeureLocale(donneesMeteo.leverSoleil, donneesMeteo.fuseauHoraire, { hour: '2-digit', minute: '2-digit' })} / 
                    {formaterHeureLocale(donneesMeteo.coucherSoleil, donneesMeteo.fuseauHoraire, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {previsionsHoraire.length > 0 && (
                <section className="forecast-section">
                  <h2>Prévisions horaires</h2>
                  <div className="forecast-scroll">
                    {previsionsHoraire.map((item, index) => (
                      <div className="forecast-item" key={index}>
                        <span>{formaterHeureLocale(item.horodatage, donneesMeteo.fuseauHoraire, { hour: '2-digit', minute: '2-digit' })}</span>
                        <img src={item.icone} alt={item.description} />
                        <strong>{item.temperature}°</strong>
                        {item.probabilitePluie > 0 && <small>☂ {Math.round(item.probabilitePluie * 100)}%</small>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {previsionsQuotidiennes.length > 0 && (
                <section className="forecast-section">
                  <h2>Les prochains jours</h2>
                  <div className="daily-forecast">
                    {previsionsQuotidiennes.map((jour, index) => (
                      <div className="daily-item" key={index}>
                        <span>
                          {formaterHeureLocale(jour.date, donneesMeteo.fuseauHoraire, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                        <img src={jour.icone} alt={jour.description} />
                        <strong>{jour.max}° / {jour.min}°</strong>
                        <small>{jour.description}</small>
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