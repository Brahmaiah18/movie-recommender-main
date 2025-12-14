import pickle
import numpy as np

print("Loading similarity matrix...")
similarity = pickle.load(open('similarity.pkl', 'rb'))

print("Original size:", similarity.nbytes / (1024 * 1024), "MB")

# Convert to float32 (Reduces size by 50%)
similarity = similarity.astype('float32')

print("New size:", similarity.nbytes / (1024 * 1024), "MB")

print("Saving compressed file...")
pickle.dump(similarity, open('similarity.pkl', 'wb'))

print("Done! You can now upload this to GitHub.")