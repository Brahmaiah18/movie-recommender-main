"""
scripts/fetch_tmdb_to_db.py

Usage:
  # from project root, with venv activated and env vars set:
  python scripts/fetch_tmdb_to_db.py --count 5000

Requirements:
  pip install requests psycopg2-binary sqlalchemy python-dotenv
"""

import os
import time
import argparse
import requests
from sqlalchemy import create_engine, Table, Column, Integer, Text, MetaData, Date
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from dotenv import load_dotenv

load_dotenv()  # optional - loads backend/.env if you cd there or set env explicitly

TMDB_API_KEY = os.getenv("TMDB_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")  # e.g. postgresql://postgres:...@127.0.0.1:5432/movie_recommender

if not TMDB_API_KEY:
    raise SystemExit("TMDB_API_KEY not found in environment. Set TMDB_API_KEY in .env or as env var.")
if not DATABASE_URL:
    raise SystemExit("DATABASE_URL not found in environment. Set DATABASE_URL in .env or as env var.")

# Config
BASE_URL = "https://api.themoviedb.org/3"
DISCOVER_ENDPOINT = f"{BASE_URL}/discover/movie"
# TMDB returns ~20 results/page. To collect 5000 you'd need ~250 pages.
REQUEST_DELAY = 0.30  # seconds between requests (adjust if you hit rate limits)
BATCH_SIZE = 100  # how many rows to insert per transaction

# DB setup (SQLAlchemy core)
engine = create_engine(DATABASE_URL, future=True)
metadata = MetaData()

movies_table = Table(
    "movies",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("tmdb_id", Integer, unique=True, index=True),
    Column("title", Text),
    Column("overview", Text),
    Column("poster_path", Text),
    Column("release_date", Date),
)

def ensure_table():
    metadata.create_all(engine)
    print("Ensured movies table exists.")

def fetch_page(page):
    params = {
        "api_key": TMDB_API_KEY,
        "page": page,
        "language": "en-US",
        "sort_by": "popularity.desc",  # change as needed
        # you can add filters here, like "vote_count.gte": 50 to avoid very obscure movies
    }
    r = requests.get(DISCOVER_ENDPOINT, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def normalize_movie(item):
    return {
        "tmdb_id": item.get("id"),
        "title": item.get("title") or item.get("name"),
        "overview": item.get("overview"),
        "poster_path": item.get("poster_path"),
        "release_date": item.get("release_date") or None,
    }

def upsert_batch(conn, rows):
    # Uses PostgreSQL ON CONFLICT DO NOTHING to avoid duplicates
    if not rows:
        return
    stmt = pg_insert(movies_table).values(rows)
    stmt = stmt.on_conflict_do_nothing(index_elements=["tmdb_id"])
    conn.execute(stmt)
    conn.commit()

def main(target_count):
    ensure_table()
    collected = 0
    page = 1
    max_pages_seen = None

    with engine.connect() as conn:
        while collected < target_count:
            print(f"Fetching TMDB page {page} ...")
            data = fetch_page(page)
            if max_pages_seen is None:
                max_pages_seen = data.get("total_pages") or 0
                print(f"TMDB reports total_pages = {max_pages_seen}")

            results = data.get("results", [])
            if not results:
                print("No results on this page — stopping.")
                break

            rows = [normalize_movie(r) for r in results]
            # insert in smaller batches to be safe
            for i in range(0, len(rows), BATCH_SIZE):
                batch = rows[i:i+BATCH_SIZE]
                upsert_batch(conn, batch)

            collected_now = len(results)
            collected += collected_now
            print(f"Collected +{collected_now} movies (total {collected}).")

            # Stop conditions
            if page >= (max_pages_seen or page):
                print("Reached last available TMDB page.")
                break
            if collected >= target_count:
                print("Reached target count.")
                break

            page += 1
            time.sleep(REQUEST_DELAY)

    print(f"Finished. Total collected (attempted inserts): {collected}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch movies from TMDB and populate PostgreSQL")
    parser.add_argument("--count", type=int, default=1000, help="Number of movies to collect (default 1000)")
    args = parser.parse_args()
    main(args.count)
