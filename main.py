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

# ==========================================
# 1. DATABASE CONFIGURATION (CLOUD READY)
# ==========================================

# This command looks for the Cloud Database. If not found, it uses your Local one.
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin123@127.0.0.1:5433/postgres")

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

# Load ML Models
# NOTE: Ensure 'movies.pkl' and 'similarity.pkl' are in the same folder
movies = pickle.load(open('movies.pkl', 'rb'))
similarity = pickle.load(open('similarity.pkl', 'rb'))

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

@app.get("/recommend_hybrid/{user_id}")
def recommend_hybrid(user_id: int, db: Session = Depends(get_db)):
    recommended_movies = []
    
    # STRATEGY A: User Ratings
    user_ratings = db.query(Rating).filter(Rating.user_id == user_id).all()
    
    if user_ratings:
        high_rated = [r for r in user_ratings if r.rating >= 4]
        if high_rated:
            last_liked = high_rated[-1].movie_id
            movie_row = movies[movies['movie_id'] == last_liked]
            
            if not movie_row.empty:
                movie_idx = movie_row.index[0]
                distances = similarity[movie_idx]
                movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]
                
                for i in movies_list:
                    rec_id = movies.iloc[i[0]].movie_id
                    recommended_movies.append({
                        "title": movies.iloc[i[0]].title,
                        "id": int(rec_id),
                    })
                return {"type": "Because you liked " + movie_row.iloc[0].title, "recommendations": recommended_movies}

    # STRATEGY B: Preferred Genres
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.genres:
        user_genres = user.genres.split(",") 
        filtered = movies[movies['genres'].apply(lambda x: any(g in x for g in user_genres))].head(5)
        for index, row in filtered.iterrows():
            recommended_movies.append({
                "title": row['title'],
                "id": int(row['movie_id']),
            })
        return {"type": "Based on your interests (" + user_genres[0] + ")", "recommendations": recommended_movies}

    # STRATEGY C: Trending
    for i in range(5):
        recommended_movies.append({
            "title": movies.iloc[i].title,
            "id": int(movies.iloc[i].movie_id),
        })
    return {"type": "Trending Movies", "recommendations": recommended_movies}

@app.get("/recommend/{movie}")
def recommend(movie: str):
    if movie not in movies['title'].values:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie_index = movies[movies['title'] == movie].index[0]
    distances = similarity[movie_index]
    movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]
    recommended_movies = []
    for i in movies_list:
        recommended_movies.append({
            "title": movies.iloc[i[0]].title,
            "id": int(movies.iloc[i[0]].movie_id)
        })
    return {"input_movie": movie, "recommendations": recommended_movies} 