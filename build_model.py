import pandas as pd
import pickle
import ast
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# 1. Load the data we saved in the previous step
print("Loading movie data...")
movies = pickle.load(open('movies_list.pkl', 'rb'))

# --- PREPROCESSING (Feature Engineering) ---

# Helper function to get top 3 actors
def convert3(text):
    L = []
    counter = 0
    try:
        for i in ast.literal_eval(text):
            if counter < 3:
                L.append(i['name'])
                counter += 1
    except:
        return []
    return L

# Helper function to fetch the Director
def fetch_director(text):
    L = []
    try:
        for i in ast.literal_eval(text):
            if i['job'] == 'Director':
                L.append(i['name'])
                break
    except:
        return []
    return L

# Helper function to remove spaces (e.g., "Tom Hanks" -> "TomHanks")
# This is important so the model treats "Tom Hanks" as one unique entity
def collapse(L):
    L1 = []
    for i in L:
        L1.append(i.replace(" ",""))
    return L1

print("Processing Cast and Crew...")
movies['cast'] = movies['cast'].apply(convert3)
movies['crew'] = movies['crew'].apply(fetch_director)

# Apply space removal to all categorical columns
movies['cast'] = movies['cast'].apply(collapse)
movies['crew'] = movies['crew'].apply(collapse)
movies['genres'] = movies['genres'].apply(collapse)
movies['keywords'] = movies['keywords'].apply(collapse)

# Process 'overview' (it's a string, we need it as a list of words)
movies['overview'] = movies['overview'].apply(lambda x: x.split() if isinstance(x, str) else [])

# CREATE TAGS: Combine everything into one big list of words for each movie
print("Creating 'tags' column...")
movies['tags'] = movies['overview'] + movies['genres'] + movies['keywords'] + movies['cast'] + movies['crew']

# Create a new dataframe with just ID, Title, and Tags
new_df = movies[['movie_id', 'title', 'tags']]

# Convert list of tags back to a string ("Action Adventure TomHanks...")
new_df['tags'] = new_df['tags'].apply(lambda x: " ".join(x))
new_df['tags'] = new_df['tags'].apply(lambda x: x.lower()) # Lowercase for consistency

# --- MODEL BUILDING ---

print("Vectorizing text data (Bag of Words)...")
# We use CountVectorizer to convert text -> numbers
cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(new_df['tags']).toarray()

print("Calculating Cosine Similarity...")
# This computes the similarity score (0 to 1) between every movie pair
similarity = cosine_similarity(vectors)

# --- SAVING ---

print("Saving the model files...")
# We save 'new_df' (final data) and 'similarity' (the math matrix)
pickle.dump(new_df, open('movies.pkl', 'wb'))
pickle.dump(similarity, open('similarity.pkl', 'wb'))

print("-" * 50)
print("✅ MODEL BUILT SUCCESSFULLY!")
print(f"Similarity Matrix Shape: {similarity.shape}")
print("Files created: 'movies.pkl' and 'similarity.pkl'")