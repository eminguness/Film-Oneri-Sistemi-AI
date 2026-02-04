from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pickle
import pandas as pd
import requests
import os
from dotenv import load_dotenv
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

# .env dosyasını yükle
load_dotenv()

app = FastAPI()

# CORS: Ön yüzün farklı porttan API'ye istek atabilmesi için
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Verileri Yükle
movies_dict = pickle.load(open('movie_dict.pkl', 'rb'))
movies = pd.DataFrame(movies_dict)
similarity = pickle.load(open('similarity.pkl', 'rb'))

API_KEY = os.getenv("TMDB_API_KEY")
executor = ThreadPoolExecutor(max_workers=10)


# =========================================================
# YENİ FONKSİYON: POSTER ÇEKİCİ
# =========================================================
def fetch_poster(movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=en-US"

    try:
        data = requests.get(url).json()
        poster_path = data.get('poster_path', '')
        if poster_path:
            return f"https://image.tmdb.org/t/p/w500/{poster_path}"
        return "https://via.placeholder.com/500x750?text=Resim+Yok"
    except:
        return "https://via.placeholder.com/500x750?text=Resim+Yok"


# =========================================================
# YENİ FONKSİYON: TMDB'DEN TÜRKÇE FİLM DETAYLARI
# =========================================================
def fetch_movie_details_turkish(movie_id):
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=tr-TR"

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Film detayları alınırken hata (ID: {movie_id}): {e}")
        return None


# =========================================================
# YENİ FONKSİYON: TMDB'DEN KISA FİLM BİLGİLERİ
# =========================================================
def fetch_movie_brief_info(movie_id):
    """Resimdeki gibi kısa bilgiler için (tür, yıl, puan, kısa açıklama)"""
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={API_KEY}&language=tr-TR"

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        # Türleri al
        genres = [genre["name"] for genre in data.get("genres", [])]

        # Yılı al
        release_year = ""
        if data.get("release_date"):
            try:
                release_year = datetime.strptime(data["release_date"], "%Y-%m-%d").year
            except:
                release_year = data["release_date"][:4] if len(data["release_date"]) >= 4 else ""

        # Puan
        vote_average = data.get("vote_average", 0)
        rating_stars = "★ " + str(round(vote_average, 1)) if vote_average > 0 else "★ 0.0"

        # Kısa açıklama (ilk 100 karakter)
        overview = data.get("overview", "")
        if len(overview) > 100:
            overview = overview[:100] + "..."

        return {
            "genres": genres[:3],  # İlk 3 tür
            "year": release_year,
            "rating": rating_stars,
            "overview": overview,
            "vote_average": vote_average,
            "runtime": data.get("runtime", 0)
        }
    except Exception as e:
        print(f"Film kısa bilgileri alınırken hata (ID: {movie_id}): {e}")
        return {
            "genres": ["Bilinmiyor"],
            "year": "",
            "rating": "★ 0.0",
            "overview": "Bu filmin açıklaması mevcut değil.",
            "vote_average": 0,
            "runtime": 0
        }


# =========================================================
# GÜNCELLENMİŞ ÖNERİ FONKSİYONU (DETAYLAR İLE)
# =========================================================
@app.get("/recommend/{movie}")
def recommend(movie: str):
    if movie not in movies['title'].values:
        raise HTTPException(status_code=404, detail="Film bulunamadı")

    movie_index = movies[movies['title'] == movie].index[0]
    searched_movie_id = movies.iloc[movie_index].id

    # Aranan filmin posterini ve detaylarını al
    film_poster = fetch_poster(searched_movie_id)
    film_details = fetch_movie_brief_info(searched_movie_id)

    distances = similarity[movie_index]
    movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:6]

    recommended_movies_data = []

    # Paralel olarak film detaylarını al
    for i in movies_list:
        movie_id = movies.iloc[i[0]].id
        movie_title = movies.iloc[i[0]].title
        movie_poster = fetch_poster(movie_id)
        movie_details = fetch_movie_brief_info(movie_id)

        recommended_movies_data.append({
            "title": movie_title,
            "poster": movie_poster,
            "genres": movie_details["genres"],
            "year": movie_details["year"],
            "rating": movie_details["rating"],
            "overview": movie_details["overview"],
            "vote_average": movie_details["vote_average"],
            "runtime": movie_details["runtime"]
        })

    return {
        "film": movie,
        "film_poster": film_poster,
        "film_details": film_details,
        "oneriler": recommended_movies_data
    }


# =========================================================
# YENİ ENDPOINT: BATCH FİLM DETAYLARI
# =========================================================
@app.get("/batch_movie_details")
async def get_batch_movie_details(movie_titles: str):
    """Birden fazla film için detayları toplu olarak getirir"""
    titles = movie_titles.split(',')
    results = []

    for title in titles:
        if title in movies['title'].values:
            movie_index = movies[movies['title'] == title].index[0]
            movie_id = movies.iloc[movie_index].id
            details = fetch_movie_brief_info(movie_id)

            results.append({
                "title": title,
                "details": details
            })

    return {"movies": results}


# =========================================================
# YENİ ENDPOINT: TMDB'DEN FİLM DETAYLARI (TÜRKÇE)
# =========================================================
@app.get("/movie_details/{movie_title}")
def get_movie_details(movie_title: str):
    if movie_title not in movies['title'].values:
        raise HTTPException(status_code=404, detail="Film bulunamadı")

    movie_index = movies[movies['title'] == movie_title].index[0]
    movie_id = movies.iloc[movie_index].id

    details = fetch_movie_details_turkish(movie_id)

    if not details:
        raise HTTPException(status_code=404, detail="Film detayları bulunamadı")

    return {
        "title": details.get("title", movie_title),
        "original_title": details.get("original_title", ""),
        "overview": details.get("overview", "Özet bulunamadı."),
        "genres": [genre["name"] for genre in details.get("genres", [])],
        "release_date": details.get("release_date", ""),
        "runtime": details.get("runtime", 0),
        "vote_average": details.get("vote_average", 0),
        "vote_count": details.get("vote_count", 0),
        "poster_path": f"https://image.tmdb.org/t/p/w500{details.get('poster_path', '')}" if details.get(
            "poster_path") else "",
        "backdrop_path": f"https://image.tmdb.org/t/p/w500{details.get('backdrop_path', '')}" if details.get(
            "backdrop_path") else "",
        "imdb_id": details.get("imdb_id", ""),
        "status": details.get("status", "")
    }


# =========================================================
# YENİ ENDPOINT: TÜM FİLM LİSTESİ (ID'LER İLE)
# =========================================================
@app.get("/all_movies")
def get_all_movies_with_ids():
    """Tüm film listesini ID'ler ile birlikte döner."""
    movies_list = movies[['id', 'title']].to_dict('records')
    return {"movies": movies_list}


@app.get("/movies")
def get_movies():
    """Ön yüzde arama/autocomplete için film listesini döner."""
    titles = movies["title"].tolist()
    return {"movies": titles}


# Ön yüz dosyalarını sun (HTML, CSS, JS)
app.mount("/", StaticFiles(directory="static", html=True), name="static")