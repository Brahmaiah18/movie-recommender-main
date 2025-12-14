import pandas as pd
import ast # Library to convert stringified lists to actual lists
import pickle # Library to save data for later use

# 1. Load the data (Same as before)
movies = pd.read_csv('tmdb_5000_movies.csv')
credits = pd.read_csv('tmdb_5000_credits.csv')

# 2. Merge datasets
movies = movies.merge(credits, on='title')

# 3. Select only the columns we need for the Recommendation Engine
# We keep these specific columns based on your workflow requirements
movies = movies[['movie_id', 'title', 'overview', 'genres', 'keywords', 'cast', 'crew']]

# 4. Define a function to clean the messy JSON columns
def convert(text):
    L = []
    try:
        # This converts string "[{'name': 'Action'}]" -> list [{'name': 'Action'}]
        for i in ast.literal_eval(text):
            L.append(i['name']) 
    except:
        return []
    return L

# 5. Apply the cleaning function
print("Cleaning 'genres' column...")
movies['genres'] = movies['genres'].apply(convert)

print("Cleaning 'keywords' column...")
movies['keywords'] = movies['keywords'].apply(convert)

# 6. Extract the unique list of genres for the "User Input" menu
all_genres = set()
for genre_list in movies['genres']:
    for genre in genre_list:
        all_genres.add(genre)

# 7. Save the processed data
# We save as .pkl (Pickle) files because they are faster for Python to read than CSVs
print("Saving processed files...")

# Save the full movie data (for the Recommendation Engine)
pickle.dump(movies, open('movies_list.pkl', 'wb'))

# Save the simple list of genres (for the User Frontend)
pickle.dump(list(all_genres), open('genres.pkl', 'wb'))

print("-" * 50)
print("✅ SUCCESS!")
print(f"Extracted {len(all_genres)} unique genres.")
print("Files created: 'movies_list.pkl' and 'genres.pkl'")
print("Ready for Step 2 (Building the Similarity Engine)")