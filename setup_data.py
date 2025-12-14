import pandas as pd

# 1. Load the datasets
# (Using the filenames exactly as shown in your screenshot)
movies = pd.read_csv('tmdb_5000_movies.csv')
credits = pd.read_csv('tmdb_5000_credits.csv')

# 2. Print the first few rows to check if it worked
print("Movies Data Loaded Successfully!")
print("Columns in Movies:", movies.columns)
print("-" * 50)
print("First Movie Title:", movies['title'][0])

# 3. Merge the files (We need to combine them for the full dataset)
movies = movies.merge(credits, on='title')

print("-" * 50)
print(f"Total Movies Merged: {movies.shape[0]}")
print("Setup Complete! Ready for Step 2.")