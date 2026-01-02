import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
// UI updated with screenshots documentation



function App() {

  const [preferredGenres, setPreferredGenres] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [view, setView] = useState('login');
  const [user, setUser] = useState(null);
  const [movie, setMovie] = useState('');
  const [language, setLanguage] = useState("en");
  const [history, setHistory] = useState([]);
  const [recommendReason, setRecommendReason] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [langTrending, setLangTrending] = useState({});
  const [hoverTrailer, setHoverTrailer] = useState(null);
  const [hoveredMovieId, setHoveredMovieId] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [hoveredMovie, setHoveredMovie] = useState(null);
  const [trailers, setTrailers] = useState({});



  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;


  const detectLanguageFromLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();

      const region = data.region?.toLowerCase() || "";

      if (region.includes("andhra") || region.includes("telangana")) {
        setLanguage("te");
      } else if (region.includes("tamil")) {
        setLanguage("ta");
      } else if (region.includes("karnataka")) {
        setLanguage("en");
      } else if (data.country_code === "IN") {
        setLanguage("hi");
      } else {
        setLanguage("en");
      }
    } catch {
      setLanguage("en");
    }
  };


  useEffect(() => {
    if (view === "dashboard" && user?.id) {
      detectLanguageFromLocation();
      fetchHybridRecs(user.id);
      fetchLanguageTrending();
      fetchPreferredGenreRecs(user.id);
      setHasSearched(false);

    }
  }, [view, user]);
  useEffect(() => {
    if (!user?.id) return;

    if (movie.trim() === "") {
      setHasSearched(false);
      setRecommendations([]);
      fetchHybridRecs(user.id);
      fetchPreferredGenreRecs(user.id);
    }
  }, [movie, user]);



  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Genre Selection
  const [selectedGenres, setSelectedGenres] = useState([]);
  const genresList = ["Action", "Adventure", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller"];

  // Dashboard Data

  const [recommendations, setRecommendations] = useState([]);
  const [hybridRecs, setHybridRecs] = useState([]); // For "Recommended For You"
  const [recReason, setRecReason] = useState('Trending Now');


  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [genreRecs, setGenreRecs] = useState([]);

  console.log("VIEW:", view);
  console.log("USER:", user);
  console.log("MOVIE:", movie);
  console.log("RECOMMENDATIONS:", recommendations);


  const TMDB_API_KEY = "9efc5448a5465a64b6db56eb718f52cf";


  // --- CLOUD API URL (Used everywhere now) ---
  const API_URL = "http://127.0.0.1:8000";



  // --- 1. AUTH FLOW ---

  const handleSignup = async () => {
    try {
      // FIX: Uses Cloud URL
      const res = await axios.post(`${API_URL}/signup`, { email, password });
      setUser({ id: res.data.user_id, email });


      setView('onboarding');
    } catch (err) { setAuthError("Signup failed. Email may be taken."); }
  };

  const handleLogin = async () => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });

      const userId = res.data.user_id;

      setUser({ id: userId, email });

      if (!res.data.genres) {
        setView('onboarding');
      } else {
        setView('dashboard');

        fetchHybridRecs(userId);
        fetchPreferredGenreRecs(userId);
        fetchHistory(userId);   // 🟢 FIXED
      }
    } catch (err) {
      setAuthError("Invalid credentials");
    }
  };





  // --- 2. GENRE ONBOARDING ---
  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const submitGenres = async () => {
    // FIX: Uses Cloud URL
    await axios.post(`${API_URL}/update_genres`, {
      user_id: user.id,
      genres: selectedGenres.join(",")
    });
    setView('dashboard');
    fetchHybridRecs(user.id);
  };

  // --- 3. HYBRID RECOMMENDATIONS ---

  const fetchHybridRecs = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/recommend_hybrid/${userId}`);

      const rawRecs = res.data.recommendations || [];

      // 🔥 FILTER OUT BAD MOVIES
      const cleanRecs = rawRecs.filter(
        (m) => m && (m.title || m.name)
      );

      const moviesWithPosters = [];

      for (const rec of cleanRecs) {
        moviesWithPosters.push({
          ...rec,
          title: rec.title || rec.name || "Untitled",
          poster: rec.poster || "/no-poster.png"
        });
      }


      setHybridRecs(moviesWithPosters);
      setRecReason(res.data.type || "Trending Now");
      setRecommendReason(res.data.reason || "");

    } catch (error) {
      console.error("Hybrid fetch error:", error);
    }
  };
  
  const fetchGenreRecs = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/recommend_by_genre/${user.id}`
      );

      const moviesWithPosters = [];
      for (const rec of res.data.recommendations) {
        moviesWithPosters.push({ ...rec, poster: rec.poster || "/no-poster.png" });

      }

      setGenreRecs(moviesWithPosters);
      setRecReason(res.data.type);
    } catch (err) {
      console.error("Genre rec error:", err);
    }
  };

  const fetchPreferredGenreRecs = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/recommend_preferred/${userId}`);

      setPreferredGenres(res.data.genres || []);
      setRecommendReason(res.data.reason || "");


      const moviesWithPosters = [];
      for (const rec of res.data.recommendations) {
        moviesWithPosters.push({ ...rec, poster: rec.poster || "/no-poster.png" });

      }

      setGenreRecs(moviesWithPosters);
    } catch (error) {
      console.error("Preferred genre fetch error:", error);
    }
  };
  const fetchHistory = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/history/${userId}`);
      setHistory(res.data);
    } catch (error) {
      console.error("History fetch error:", error);
    }
  };
  const fetchLanguageTrending = async () => {
  const langs = ["en", "te", "hi", "ta"];
  const result = {};

  for (const l of langs) {
    try {
      const res = await axios.get(`${API_URL}/trending/${l}`);
      result[l] = res.data.results || [];
    } catch (err) {
      console.error("Trending error for", l, err);
      result[l] = [];
    }
  }

  setLangTrending(result);
};




  // --- MOVIE HELPERS ---
  const fetchPoster = async (movieId) => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      if (response.data.poster_path) return "https://image.tmdb.org/t/p/w500" + response.data.poster_path;
      return "/no-poster.png";

    } catch (error) { return "/no-poster.png"; }
  };

  const handleVoiceSearch = () => {
    if (!recognition || isListening) return;

    const langMap = {
      en: "en-US",
      te: "te-IN",
      hi: "hi-IN",
      ta: "ta-IN"
    };

    recognition.lang = langMap[language] || "en-US";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMovie(transcript);
      setIsListening(false);
      recognition.stop();
      handleSearch();
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognition.stop();
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };


  const handleSearch = async () => {
    if (!movie.trim()) return;

    setLoading(true);
    setHasSearched(true);

    // Clear home sections
    setHybridRecs([]);
    setGenreRecs([]);

    try {
      const res = await axios.get(`${API_URL}/recommend/${movie}?lang=${language}`);

      const cleaned = res.data.recommendations.map(m => ({
        id: m.id,
        title: m.title,
        poster: m.poster || "https://via.placeholder.com/300x450?text=No+Poster"
      }));

      setRecommendations(cleaned);
    } catch (err) {
      console.error("Search error:", err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };



  // --- SAFE MODE CLICK HANDLER ---
  const fetchTrailer = async (movieId) => {
    if (trailers[movieId]) return;

    try {
      const res = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`
      );

      const trailer = res.data.results.find(
        v => v.type === "Trailer" && v.site === "YouTube"
      );

      if (trailer) {
        setTrailers(prev => ({
          ...prev,
          [movieId]: trailer.key
        }));
      }
    } catch (err) {
      console.log("Trailer error:", err);
    }
  };

  const handleMovieClick = async (movie) => {
    if (user) {
      axios.post(`${API_URL}/log_history`, { user_id: user.id, movie_id: movie.id })
        .catch(() => { });
    }

    try {
      const res = await axios.get(
        `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`
      );

      const trailer = res.data.videos?.results.find(
        v => v.type === "Trailer" && v.site === "YouTube"
      );

      setTrailerKey(trailer ? trailer.key : null);
      setSelectedMovie({ ...res.data, poster: movie.poster });
      setUserRating(0);

    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };



  const submitRating = async (rateValue) => {
    setUserRating(rateValue);
    if (!user) return;

    await axios.post(`${API_URL}/rate`, {
      user_id: user.id,
      movie_id: selectedMovie.id,
      rating: rateValue
    });

    alert("Rating Saved! We will recommend similar movies next time.");
    fetchHybridRecs(user.id);
  };


  // --- RENDER ---
  if (view === 'login' || view === 'signup') {
    return (
      <div className="App auth-container">
        <div className="auth-box">
          <h1>🎬 Movie AI</h1>
          <h2>{view === 'login' ? 'Login' : 'Create Account'}</h2>
          <input type="email" placeholder="Email" className="auth-input" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="auth-input" value={password} onChange={e => setPassword(e.target.value)} />
          {authError && <p className="error-msg">{authError}</p>}
          <button className="search-btn full-width" onClick={view === 'login' ? handleLogin : handleSignup}>{view === 'login' ? 'Login' : 'Sign Up'}</button>
          <p className="switch-text">{view === 'login' ? "New? " : "Have account? "} <span onClick={() => setView(view === 'login' ? 'signup' : 'login')}>{view === 'login' ? 'Sign Up' : 'Login'}</span></p>
        </div>
      </div>
    );
  }

  if (view === 'onboarding') {
    return (
      <div className="App auth-container">
        <div className="auth-box" style={{ width: '600px' }}>
          <h1>Welcome! 👋</h1>
          <h2>Select your favorite genres</h2>

          <div className="genres-grid">
            {genresList.map(g => (
              <button
                key={g}
                className={`genre-btn ${selectedGenres.includes(g) ? 'selected' : ''}`}
                onClick={() => toggleGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <button className="search-btn full-width" onClick={submitGenres}>
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="nav-bar">
          <h1>🎬 Movie AI</h1>
          <div className="user-info"><span>👤 {user?.email}</span><button onClick={() => setView('login')} className="logout-btn">Logout</button></div>
        </div>



        <div className="language-switch">
          {[
            { label: "EN", code: "en" },
            { label: "TE", code: "te" },
            { label: "HI", code: "hi" },
            { label: "TA", code: "ta" }
          ].map((lang) => (
            <button
              key={lang.code}
              className={`lang-btn ${language === lang.code ? "active" : ""}`}
              onClick={() => setLanguage(lang.code)}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search any movie..."
            value={movie}
            onChange={e => setMovie(e.target.value)}
            className="search-box"
          />

          <button
            onClick={handleVoiceSearch}
            className="mic-btn"
            disabled={isListening}
          >
            {isListening ? "🎙️" : "🎤"}
          </button>

          <button onClick={handleSearch} className="search-btn">
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* 🔥 Recommended For You (Now BELOW search box) */}
        {/* 🔙 Back to Home Button */}
        {hasSearched && (
          <button
            className="home-btn"
            onClick={() => {
              setMovie("");
              setHasSearched(false);
              setRecommendations([]);
              fetchHybridRecs(user.id);
              fetchPreferredGenreRecs(user.id);
            }}
          >
            ⬅ Back to Home
          </button>
        )}

        {/* 🔍 SEARCH MODE — ONLY SEARCH RESULTS */}
        {hasSearched && (
          <div className="movie-grid">
            {recommendations.length === 0 && !loading && (
              <p style={{ color: "#aaa", marginTop: "40px" }}>
                No movies found 😢
              </p>
            )}

            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="movie-card"
                onClick={() => handleMovieClick(rec)}
              >
                <img
                  src={rec.poster}
                  alt={rec.title}
                  className="movie-poster"
                  onError={(e) => (e.target.src = "https://via.placeholder.com/300x450?text=No+Poster")}
                />
              </div>
            ))}

          </div>
        )}

        {/* 🏠 HOME MODE — HIDDEN DURING SEARCH */}
        {!hasSearched && (
          <>
            {/* Preferred Genres */}
            {genreRecs.length > 0 && (
              <div className="hybrid-section">
                <h2>
                  Based on Your Preferred Genres
                  <span className="rec-reason">
                    ({preferredGenres.join(", ")})
                  </span>
                </h2>
                {recommendReason && (
                  <p className="reason-text">{recommendReason}</p>
                )}


                <div className="movie-grid">
                  {genreRecs.map((movie) => (
                    <div
                      className="movie-card"
                      onMouseEnter={() => {
                        setHoveredMovie(movie.id);
                        fetchTrailer(movie.id);
                      }}
                      onMouseLeave={() => setHoveredMovie(null)}
                      onClick={() => handleMovieClick(movie)}
                    >
                      {hoveredMovie === movie.id && trailers[movie.id] ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${trailers[movie.id]}?autoplay=1&mute=1&controls=0`}
                          className="trailer-frame"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          title={movie.title}
                        />
                      ) : (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="movie-poster"
                        />
                      )}
                    </div>

                  ))}
                </div>
              </div>
            )}
            {history.length > 0 && (
              <div className="row-container">
                <h2 className="row-title">Recently Watched</h2>
                <div className="row-posters">
                  {history.map(h => (
                    <div key={h.movie_id} className="row-poster-card" onMouseEnter={() => fetchTrailer(movie.id)}
                      onMouseLeave={() => setHoveredMovie(null)
                      }>
                      <img
                        src={`https://image.tmdb.org/t/p/w500${h.poster}`}
                        className="row-poster"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hybrid Recommendations */}
            {hybridRecs.length > 0 && (
              <div className="row-container">
                <h2 className="row-title">
                  Recommended For You{" "}
                  <span className="row-subtitle">(Trending + Personalized)</span>
                </h2>

                <div className="row-posters">
                  {hybridRecs.map((movie) => (
                    <div
                      key={movie.id}
                      className="row-poster-card"
                      onMouseEnter={() => fetchTrailer(movie.id)}
                      onMouseLeave={() => setHoveredMovie(null)
                      }
                      onClick={() => handleMovieClick(movie)}
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="row-poster"
                      />
                    </div>

                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {/* 🌍 Language-wise Trending */}
{
    ["en", "te", "hi", "ta"].map(code => (
      langTrending[code]?.length > 0 && (
        <div className="row-container" key={code}>
          <h2 className="row-title">
            Trending in {code.toUpperCase()}
          </h2>

          <div className="row-posters">
            {langTrending[code].map(movie => (
              <div
                key={movie.id}
                className="row-poster-card"
                onClick={() => handleMovieClick(movie)}
              >
                <img
                  src={movie.poster}
                  className="row-poster"
                  alt={movie.title}
                  onError={(e) => (e.target.src = "/no-poster.png")}
                />
              </div>
            ))}

          </div>
        </div>
      )
    ))
  }

        {selectedMovie && (
          <div className="modal-overlay" onClick={() => setSelectedMovie(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button
                className="close-btn"
                onClick={() => {
                  setSelectedMovie(null);
                  setTrailerKey(null);
                }}
              >
                &times;
              </button>

              <div className="modal-body">

                {trailerKey ? (
                  <div className="trailer-box">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
                      title="Trailer"
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <img src={selectedMovie.poster} className="modal-poster" alt="poster" />
                )}

                <div className="modal-info">
                  <h2>{selectedMovie.title}</h2>
                  <div className="rating-section">
                    <span>Rate: </span>

                    {[1, 2, 3, 4, 5].map(s => <span key={s} className={`star ${s <= userRating ? 'filled' : ''}`} onClick={() => submitRating(s)}>★</span>)}
                  </div>
                  <p className="overview">{selectedMovie.overview}</p>
                  <div className="stats-grid">
                    <div className="stat-item"><span className="label">Rating</span><span className="value">⭐ {selectedMovie.vote_average?.toFixed(1)}</span></div>
                    <div className="stat-item"><span className="label">Release</span><span className="value">{selectedMovie.release_date}</span></div>
                  </div>


                  <h3 style={{ marginTop: '20px' }}>Top Cast</h3>
                  <div className="cast-grid">
                    {selectedMovie.credits?.cast.slice(0, 5).map(actor => (
                      <div key={actor.id} className="actor-card">
                        <img src={actor.profile_path ? "https://image.tmdb.org/t/p/w200" + actor.profile_path : "https://via.placeholder.com/50x75?text=Actor"} alt={actor.name} className="actor-img" />
                        <p>{actor.name}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
        {hoverTrailer && (
          <div className="trailer-preview">
            <iframe
              src={`https://www.youtube.com/embed/${hoverTrailer}?autoplay=1&mute=1`}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        )}

      </header>
    </div >
  );
}

export default App;
