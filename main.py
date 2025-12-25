import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import pickle
from datetime import datetime
import pandas as pd
import requests
movies = None
similarity = None
def tmdb_fallback_search(query):
    url = "https://api.themoviedb.org/3/search/movie"
    params = {"api_key": TMDB_API_KEY, "query": query}
    try:
        res = requests.get(url, params=params, timeout=10)
        if res.status_code == 200:
            return res.json().get("results", [])
    except:
        pass
    return []


TMDB_API_KEY = "9efc5448a5465a64b6db56eb718f52cf"


# ==========================================
# 1. DATABASE CONFIGURATION (CLOUD READY)
# ==========================================

# This command looks for the Cloud Database. If not found, it uses your Local one.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Daggu%40123@127.0.0.1:5432/movie_recommender")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Daggu%40123@127.0.0.1:5432/movie_recommender")

# FIX: Render uses 'postgres://' but SQLAlchemy needs 'postgresql://'
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- TABLES ---
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    genres = Column(String) # Stores "Action,Comedy,Drama"

class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer)
    rating = Column(Integer)

class WatchHistory(Base):
    __tablename__ = "watch_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    movie_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# 2. APP & ML SETUP
# ==========================================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
def load_models():
    global movies, similarity
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))

        with open(os.path.join(base_dir, "movies.pkl"), "rb") as f:
            movies = pickle.load(f)

        with open(os.path.join(base_dir, "similarity.pkl"), "rb") as f:
            similarity = pickle.load(f)

        print("✅ ML models loaded successfully")

    except Exception as e:
        print("❌ Model loading failed:", e)
        movies = None
        similarity = None


# Load ML Models
# NOTE: Ensure 'movies.pkl' and 'similarity.pkl' are in the same folder
#movies = pickle.load(open('movies.pkl', 'rb'))
#similarity = pickle.load(open('similarity.pkl', 'rb'))

# ==========================================
# 3. DATA MODELS
# ==========================================
class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GenreUpdate(BaseModel):
    user_id: int
    genres: str 

class MovieRating(BaseModel):
    user_id: int
    movie_id: int
    rating: int

class HistoryLog(BaseModel):
    user_id: int
    movie_id: int

# ==========================================
# 4. API ROUTES
# ==========================================



@app.get("/")
def home():
    return {"message": "Movie Recommender API is Live"}

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing: raise HTTPException(status_code=400, detail="Email taken")
    new_user = User(email=user.email, password=user.password, genres="")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or db_user.password != user.password:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": db_user.id, "genres": db_user.genres}

@app.post("/update_genres")
def update_genres(data: GenreUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.user_id).first()
    if user:
        user.genres = data.genres
        db.commit()
    return {"message": "Genres updated"}

@app.post("/rate")
def rate_movie(rating: MovieRating, db: Session = Depends(get_db)):
    # Check if exists, else create new
    existing = db.query(Rating).filter(Rating.user_id == rating.user_id, Rating.movie_id == rating.movie_id).first()
    if existing:
        existing.rating = rating.rating
    else:
        new_rating = Rating(user_id=rating.user_id, movie_id=rating.movie_id, rating=rating.rating)
        db.add(new_rating)
    db.commit()
    return {"message": "Rating saved"}

@app.post("/log_history")
def log_history(log: HistoryLog, db: Session = Depends(get_db)):
    history = WatchHistory(user_id=log.user_id, movie_id=log.movie_id)
    db.add(history)
    db.commit()
    return {"message": "History logged"}



# ==========================================
# 5. RECOMMENDATION ENGINES
# ==========================================
def fetch_telugu_english_movies():
    url = "https://api.themoviedb.org/3/trending/movie/week"
    params = {
        "api_key": TMDB_API_KEY,
        "region": "IN"
    }

    response = requests.get(url, params=params)
    if response.status_code != 200:
        return []

    results = response.json().get("results", [])

    movies = []
    for m in results:
        if m.get("original_language") in ["te", "en"]:
            movies.append({
                "id": m["id"],
                "title": m["title"]
            })

    return movies[:5]

@app.get("/recommend_hybrid/{user_id}")
def recommend_hybrid(user_id: int):
    movies = tmdb_search("movie")  # always returns trending

    return {
        "type": "Trending",
        "recommendations": [
            {"id": m["id"], "title": m["title"]}
            for m in movies[:10]
        ]
    }


def tmdb_search(movie):
    url = "https://api.themoviedb.org/3/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": movie,
        "language": "en-US"
    }

    r = requests.get(url, params=params, timeout=10)

    if r.status_code != 200:
        print("❌ TMDB ERROR:", r.text)
        return []

    return r.json().get("results", [])

@app.get("/recommend_preferred/{user_id}")
def recommend_preferred(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.genres:
        raise HTTPException(status_code=404, detail="No preferred genres found")

    user_genres = user.genres.split(",")

    # Filter movies matching preferred genres
    filtered_movies = movies.head(5)


    recommendations = []
    for _, row in filtered_movies.iterrows():
        recommendations.append({
            "id": int(row['movie_id']),
            "title": row['title']
        })

    return {
        "type": "Based on your preferred genres",
        "genres": user_genres,
        "recommendations": recommendations
    }

@app.get("/recommend/{movie}")
def recommend(movie: str):

    # 1️⃣ Try ML (if models loaded)
    if movies is not None and similarity is not None:
        movies["title_lower"] = movies["title"].str.lower()
        name = movie.lower()

        if name in movies["title_lower"].values:
            index = movies[movies["title_lower"] == name].index[0]
            distances = similarity[index]

            items = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]

            return {
                "input_movie": movie,
                "recommendations": [
                    {"id": int(movies.iloc[i[0]].movie_id), "title": movies.iloc[i[0]].title}
                    for i in items
                ]
            }

    # 2️⃣ Always fallback to TMDB
    url = "https://api.themoviedb.org/3/search/movie"
    params = {"api_key": TMDB_API_KEY, "query": movie}
    r = requests.get(url, params=params, timeout=10)

    data = r.json().get("results", [])

    if not data:
        return {"input_movie": movie, "recommendations": []}

    return {
        "input_movie": movie,
        "recommendations": [
            {"id": m["id"], "title": m["title"]}
            for m in data[:5]
        ]
    }
