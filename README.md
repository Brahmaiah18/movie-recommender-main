# 🎬 End-to-End Hybrid Movie Recommendation System

> **A Full-Stack AI Application that recommends movies based on Content Similarity and User Preferences.**

![Project Banner](![Header](https://capsule-render.vercel.app/api?type=waving&color=141414&height=300&section=header&text=Movie%20Recommender%20System&fontSize=70&fontColor=E50914&fontAlign=50&fontAlignY=40&desc=Hybrid%20AI%20Engine%20•%20React%20•%20FastAPI%20•%20PostgreSQL&descSize=20&descAlign=50&descAlignY=60)


## 📌 Project Overview
This project is a complete software product, not just a script. It solves the problem of "What to watch next?" using a **Hybrid Machine Learning Engine**. 

Unlike simple recommenders, this system handles the **"Cold Start Problem"** by onboarding new users with genre preferences and evolves to use **Collaborative Filtering** logic as users rate movies. It features a secure login system, a real-time database, and a Netflix-style user interface.

## 🚀 Key Features
* **🔐 Secure Authentication:** User Signup and Login system stored in **PostgreSQL**.
* **🧠 Hybrid AI Engine:**
    * *New Users:* Recommends based on selected **Genres**.
    * *Active Users:* Recommends based on **Item-Item Similarity** from Watch History & Ratings.
* **📊 Interactive Dashboard:** Dark mode UI with HD posters fetched dynamically via API.
* **⭐ Rating System:** Users can rate movies (1-5 stars), which instantly updates recommendations.
* **⚡ Real-Time Data:** Integrates **TMDB API** for live cast, budget, and box office collections.
* **📜 History Tracking:** Automatically logs every movie clicked by the user.

---

## 🛠️ Tech Stack & Tools Used

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | **React.js** | Building the interactive User Interface (UI). |
| **Styling** | **CSS3 (Flexbox/Grid)** | Netflix-style dark theme and responsive layout. |
| **Backend** | **Python (FastAPI)** | High-performance API to handle requests and ML logic. |
| **Database** | **PostgreSQL** | Storing Users, Passwords, Ratings, and History. |
| **ORM** | **SQLAlchemy** | Connecting Python to the SQL Database. |
| **Machine Learning** | **Scikit-Learn** | Calculating Cosine Similarity & Vectorization. |
| **Data Processing** | **Pandas & NumPy** | Cleaning and manipulating the dataset. |
| **External API** | **TMDB API** | Fetching real-time posters and movie details. |

---

## 📂 Dataset Information
We used the **TMDB 5000 Movie Dataset** from Kaggle to train the model.
* **Movies:** 4,803 entries.
* **Features Used:** `genres`, `keywords`, `cast`, `crew`, `overview`.
* **Data Processing:** We merged these columns into a single "tag" and converted them into mathematical vectors using `CountVectorizer`.

---

## ⚙️ Installation & Setup Guide
Follow these steps to run the project on your local machine.

### Prerequisites
* Python 3.x installed.
* Node.js installed.
* PostgreSQL installed (pgAdmin 4).

### Step 1: Database Setup
1.  Open **pgAdmin 4**.
2.  Create a new database named `postgres` (or use the default one).
3.  Open the **Query Tool** and run this SQL command to set up the tables:
    ```sql
    -- Users Table
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(100),
        genres VARCHAR(255)
    );

    -- Ratings Table
    CREATE TABLE ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        movie_id INTEGER,
        rating INTEGER
    );

    -- Watch History Table
    CREATE TABLE watch_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        movie_id INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

### Step 2: Backend Setup (Python)
1.  Open VS Code terminal.
2.  Navigate to the project folder.
3.  Create a virtual environment:
    ```bash
    python -m venv venv
    ```
4.  Activate it:
    * **Windows:** `venv\Scripts\activate`
    * **Mac/Linux:** `source venv/bin/activate`
5.  Install dependencies:
    ```bash
    pip install fastapi uvicorn sqlalchemy psycopg2 scikit-learn pandas requests
    ```
6.  **Run the Data Preprocessing** (Only need to do this once):
    ```bash
    python preprocess.py
    python build_engine.py
    ```
    *(This creates the `movies.pkl` and `similarity.pkl` model files).*
7.  **Start the Server:**
    ```bash
    uvicorn main:app --reload
    ```
    *You should see: `Application startup complete.`*

### Step 3: Frontend Setup (React)
1.  Open a **new** terminal (keep Python running).
2.  Navigate to the frontend folder:
    ```bash
    cd frontend
    ```
3.  Install React dependencies:
    ```bash
    npm install
    ```
4.  Start the website:
    ```bash
    npm start
    ```
5.  The app will open at `http://localhost:3000`.

---

## 🧠 How the Recommendation Logic Works

### 1. Preprocessing
We clean the data by removing spaces (e.g., "Sam Worthington" → "SamWorthington") to treat them as unique entities. We combine all text data into a single "Tag".

### 2. Vectorization
We use **CountVectorizer** to convert the text tags into 5000-dimensional vectors.

### 3. Cosine Similarity (The Math)
We calculate the angle between vectors. 
* Small angle = High Similarity (Movies are alike).
* Large angle = Low Similarity.

### 4. Hybrid Logic (In `main.py`)
* **Scenario A (New User):** The system checks `user.genres` (from onboarding) and filters movies matching those genres.
* **Scenario B (Active User):** The system checks `ratings` table. If the user rated "Iron Man" 5 stars, it finds the 5 nearest vectors to "Iron Man".

---

## 📸 Screenshots

1.  **Login Screen**
2.  <img width="651" height="689" alt="image" src="https://github.com/user-attachments/assets/f51aaf9b-f4fd-46b8-8ac6-e2e0c781be89" />

3.  **Genre Onboarding**
4.  <img width="908" height="792" alt="Screenshot 2025-12-07 165723" src="https://github.com/user-attachments/assets/4894c56a-3286-4d49-9075-b85e497c2766" />

5.  **Dashboard with Recommendations**
6.  <img width="1871" height="839" alt="Screenshot 2025-12-07 165821" src="https://github.com/user-attachments/assets/ccb96eba-3588-4007-975d-01ed649c5be9" />

7.  **Movie Details Popup**
8.  <img width="1289" height="802" alt="Screenshot 2025-12-07 165846" src="https://github.com/user-attachments/assets/cfe7c5f3-d177-4f79-8589-55248163544a" />


---

## 🔮 Future Scope
* **Deploy to Cloud:** Host Backend on Render and Frontend on Vercel.
* **Advanced Collaborative Filtering:** Implement SVD (Singular Value Decomposition) when user base grows.
* **Mobile App:** Convert the React website into a React Native mobile app.

## 🔗 Live Demo
🎥 **[👉 Click here to visit the Live Website](https://movie-recommender-snowy.vercel.app)** *(Hosted on Vercel for frontend and Render for backend)*

---

## 👨‍💻 Author
**Vijay Battula**
* **GitHub:** [https://github.com/Vijaybattula26]
* **LinkedIn:** [https://www.linkedin.com/in/battulavijay]
* **Project Type:** MCA Final Year Project
