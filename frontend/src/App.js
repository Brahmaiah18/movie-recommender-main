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

  useEffect(() => {
  if (view === "dashboard" && user?.id) {
    fetchHybridRecs(user.id);
    fetchPreferredGenreRecs(user.id);
     setHasSearched(false);
     fetchGenreRecs();
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
 
  

  const TMDB_API_KEY = "9efc5448a5465a64b6db56eb718f52cf";


  // --- CLOUD API URL (Used everywhere now) ---
  const API_URL = "http://127.0.0.1:8000";


  // --- 1. AUTH FLOW ---
  const handleSignup = async () => {
  const handleSignup = async () => {
    try {
      // FIX: Uses Cloud URL
      const res = await axios.post(`${API_URL}/signup`, { email, password });
      setUser({ id: res.data.user_id, email });
      setView('onboarding');
      setUser({ id: res.data.user_id, email });
      setView('onboarding');
    } catch (err) { setAuthError("Signup failed. Email may be taken."); }
  };

  const handleLogin = async () => {
    try {
      // FIX: Uses Cloud URL
      const res = await axios.post(`${API_URL}/login`, { email, password });
      setUser({ id: res.data.user_id, email });
      if (!res.data.genres) setView('onboarding');
      else {
      else {
        setView('dashboard');
        fetchHybridRecs(res.data.user_id);
      }
    } catch (err) { setAuthError("Invalid credentials"); }
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

    console.log("HYBRID API RESPONSE:", res.data); // debug

    const rawRecs = res.data.recommendations || [];
    setRecReason(res.data.type || "Trending Now");
const fetchHybridRecs = async (userId) => {
  try {
    const res = await axios.get(`${API_URL}/recommend_hybrid/${userId}`);

    console.log("HYBRID API RESPONSE:", res.data); // debug

    const rawRecs = res.data.recommendations || [];
    setRecReason(res.data.type || "Trending Now");

    const moviesWithPosters = [];
    for (const rec of rawRecs) {
      const posterUrl = await fetchPoster(rec.id);
      moviesWithPosters.push({ ...rec, poster: posterUrl });
    }

    setHybridRecs(moviesWithPosters);
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
      const posterUrl = await fetchPoster(rec.id);
      moviesWithPosters.push({ ...rec, poster: posterUrl });
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

    const moviesWithPosters = [];
    for (const rec of res.data.recommendations) {
      const posterUrl = await fetchPoster(rec.id);
      moviesWithPosters.push({ ...rec, poster: posterUrl });
    }

    setGenreRecs(moviesWithPosters);
  } catch (error) {
    console.error("Preferred genre fetch error:", error);
  }
};


  // --- MOVIE HELPERS ---
  const fetchPoster = async (movieId) => {
    try {
      const response = await axios.get(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      if (response.data.poster_path) return "https://image.tmdb.org/t/p/w500" + response.data.poster_path;
      return "https://via.placeholder.com/500x750?text=No+Image";
    } catch (error) { return "https://via.placeholder.com/500x750?text=Error"; }
  };

  const handleSearch = async () => {
  setLoading(true);

  // 🔥 IMPORTANT: remove hybrid when searching
  setHybridRecs([]);
  setGenreRecs([]);
  setHasSearched(true);
  setRecReason("");

  try {
    const res = await axios.get(`${API_URL}/recommend/${movie}`);
    const moviesWithPosters = [];

    for (const rec of res.data.recommendations) {
      const posterUrl = await fetchPoster(rec.id);
      moviesWithPosters.push({ ...rec, poster: posterUrl });
    }

    setRecommendations(moviesWithPosters);
  } catch (err) {
    alert("Movie not found!");
  } finally {
    setLoading(false);
  }
};


  // --- SAFE MODE CLICK HANDLER ---
  const handleMovieClick = async (movie) => {
    // 1. Log History (Track Click)
    if (user) {
      // FIX: Uses Cloud URL
      axios.post(`${API_URL}/log_history`, { user_id: user.id, movie_id: movie.id })
        .catch(err => console.log("Logging skipped, opening movie anyway."));
        .catch(err => console.log("Logging skipped, opening movie anyway."));
    }

    // 2. Open Details
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}&language=en-US&append_to_response=credits`);
      setSelectedMovie({ ...res.data, poster: movie.poster });
      setUserRating(0);
    } catch (error) {
      console.error("Error fetching details:", error);
    }
  };

  const submitRating = async (rateValue) => {
    setUserRating(rateValue);
    if (!user) return;
    // FIX: Uses Cloud URL
    await axios.post(`${API_URL}/rate`, { user_id: user.id, movie_id: selectedMovie.id, rating: rateValue });
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
        <div className="auth-box" style={{ width: '600px' }}>
          <h1>Welcome! 👋</h1>
          <h2>Select your favorite genres</h2>
          <div className="genres-grid">
            {genresList.map(g => (
              <button
                key={g}
              <button
                key={g}
                className={`genre-btn ${selectedGenres.includes(g) ? 'selected' : ''}`}
                onClick={() => toggleGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <button className="search-btn full-width" onClick={submitGenres}>Continue to Dashboard</button>
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



        <div className="search-container">
          <input type="text" placeholder="Search any movie..." value={movie} onChange={e => setMovie(e.target.value)} className="search-box" />
          <button onClick={handleSearch} className="search-btn">{loading ? "..." : "Search"}</button>
        </div>
        {/* 🔥 Recommended For You (Now BELOW search box) */}
        {hasSearched && (
  <button
    className="home-btn"
    onClick={() => {
      setMovie("");
      setHasSearched(false);
    }}
  >
    ⬅ Back to Home
  </button>
)}

        {/* 🎯 Preferred Genre Recommendations */}
{genreRecs.length > 0 && (
  <div className="hybrid-section">
    <h2>
      Based on Your Preferred Genres
      <span className="rec-reason">
        ({preferredGenres.join(", ")})
      </span>
    </h2>

    <div className="movie-grid">
      {genreRecs.map((movie) => (
        <div
          key={movie.id}
          className="movie-card"
          onClick={() => handleMovieClick(movie)}
        >
          <img
            src={movie.poster}
            alt={movie.title}
            className="movie-poster"
          />
          <h3>{movie.title}</h3>
        </div>
      ))}
    </div>
  </div>
)}


        {/* 🎯 Dashboard Recommendations Row */}{/* 🟢 HOME MODE – Recommended For You */}
{!hasSearched && hybridRecs.length > 0 && (
  <div className="row-container">
    <h2 className="row-title">
      Recommended For You{" "}
      <span className="row-subtitle">
        (Trending + Personalized)
      </span>
    </h2>

    <div className="row-posters">
      {hybridRecs.map((movie) => (
        <div
          key={movie.id}
          className="row-poster-card"
          onClick={() => handleMovieClick(movie)}
        >
          <img
            src={movie.poster}
            alt={movie.title}
            className="row-poster"
          />
          <p className="row-movie-title">{movie.title}</p>
        </div>
      ))}
    </div>
  </div>
)}

{genreRecs.length > 0 && (
  <div className="row-container">
    <h2 className="row-title">
      Recommended For You{" "}
      <span className="row-subtitle">({recReason})</span>
    </h2>

    <div className="row-posters">
      {genreRecs.map((movie) => (
        <div
          key={movie.id}
          className="row-poster-card"
          onClick={() => handleMovieClick(movie)}
        >
          <img
            src={movie.poster}
            alt={movie.title}
            className="row-poster"
          />
          <p className="row-movie-title">{movie.title}</p>
        </div>
      ))}
    </div>
  </div>
)}


   

        <div className="movie-grid">
          {recommendations.map((rec) => (
            <div key={rec.id} className="movie-card" onClick={() => handleMovieClick(rec)}>
              <img src={rec.poster} alt={rec.title} className="movie-poster" />
              <h3>{rec.title}</h3>
            </div>
          ))}
        </div>

        {selectedMovie && (
          <div className="modal-overlay" onClick={() => setSelectedMovie(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setSelectedMovie(null)}>&times;</button>
              <div className="modal-body">
                <img src={selectedMovie.poster} className="modal-poster" alt="poster" />
                <img src={selectedMovie.poster} className="modal-poster" alt="poster" />
                <div className="modal-info">
                  <h2>{selectedMovie.title}</h2>
                  <div className="rating-section">
                    <span>Rate: </span>
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className={`star ${s <= userRating ? 'filled' : ''}`} onClick={() => submitRating(s)}>★</span>)}
                    {[1, 2, 3, 4, 5].map(s => <span key={s} className={`star ${s <= userRating ? 'filled' : ''}`} onClick={() => submitRating(s)}>★</span>)}
                  </div>
                  <p className="overview">{selectedMovie.overview}</p>
                  <div className="stats-grid">
                    <div className="stat-item"><span className="label">Rating</span><span className="value">⭐ {selectedMovie.vote_average?.toFixed(1)}</span></div>
                    <div className="stat-item"><span className="label">Release</span><span className="value">{selectedMovie.release_date}</span></div>
                  </div>

                  <h3 style={{ marginTop: '20px' }}>Top Cast</h3>

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
      </header>
    </div>
  );
}

export default App;
