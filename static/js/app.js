(function () {
    const API_BASE = ""; // Aynı sunucudan sunulduğu için boş
    const TMDB_API_KEY = "4dab5c2f8e2bfe71f847b52c9ee93689"; // TMDB API key'iniz

    const movieInput = document.getElementById("movieInput");
    const searchBtn = document.getElementById("searchBtn");
    const errorMsg = document.getElementById("errorMsg");
    const heroInner = document.getElementById("heroInner");
    const resultsSection = document.getElementById("resultsSection");
    const searchedFilmCard = document.getElementById("searchedFilmCard");
    const resultsTitle = document.getElementById("resultsTitle");
    const recommendedGrid = document.getElementById("recommendedGrid");
    const loadingSection = document.getElementById("loadingSection");
    const autocompleteDropdown = document.getElementById("autocompleteDropdown");
    const clearButton = document.getElementById("clearButton");

    // Modal elementleri
    const movieModal = document.getElementById("movieModal");
    const modalTitle = document.getElementById("modalTitle");
    const modalPoster = document.getElementById("modalPoster");
    const modalGenres = document.getElementById("modalGenres");
    const modalReleaseDate = document.getElementById("modalReleaseDate");
    const modalRuntime = document.getElementById("modalRuntime");
    const modalRating = document.getElementById("modalRating");
    const modalOverview = document.getElementById("modalOverview");
    const closeModal = document.getElementById("closeModal");
    const closeModalBtn = document.getElementById("closeModalBtn");

    let allMovies = [];
    let allMoviesData = []; // Film ID'leri de içeren tam liste
    let currentAutocompleteItems = [];
    let selectedAutocompleteIndex = -1;
    let debounceTimer;

    // Poster ve puan cache'i
    const posterCache = new Map();
    const ratingCache = new Map(); // YENİ: IMDb puanı için cache

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = message ? "block" : "none";
    }

    function setLoading(loading) {
        loadingSection.hidden = !loading;
        resultsSection.hidden = loading;
    }

    // YENİ: Gelişmiş HTML escaping fonksiyonu
    function safeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // YENİ: IMDb puanını getiren fonksiyon
    async function getIMDbRating(movieTitle, movieId) {
        const cacheKey = `${movieTitle.toLowerCase()}_${movieId}`;

        // Önce cache'den kontrol et
        if (ratingCache.has(cacheKey)) {
            return ratingCache.get(cacheKey);
        }

        // TMDB'den film detaylarını al (IMDb ID'si için)
        if (movieId) {
            try {
                const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=tr-TR`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();

                    // IMDb puanını al
                    const imdbRating = data.vote_average ? data.vote_average.toFixed(1) : null;

                    // Cache'e kaydet
                    ratingCache.set(cacheKey, imdbRating);
                    return imdbRating;
                }
            } catch (error) {
                console.log('IMDb puanı alınamadı:', movieTitle, error);
            }
        }

        // Puan bulunamadıysa null döndür
        return null;
    }

    function renderResults(data) {
        // Solda büyük poster: yazdığınız film
        searchedFilmCard.innerHTML = "";
        if (data.film) {
            heroInner.classList.add("has-results");
            const poster = data.film_poster || "https://via.placeholder.com/300x450?text=Resim+Yok";
            const card = document.createElement("div");
            card.className = "searched-film";

            // DÜZELTME: innerHTML yerine safe DOM manipulation
            const img = document.createElement("img");
            img.src = poster;
            img.alt = data.film;
            img.className = "searched-film-poster";

            const title = document.createElement("p");
            title.className = "searched-film-title";
            title.textContent = data.film;

            card.appendChild(img);
            card.appendChild(title);
            searchedFilmCard.appendChild(card);
            searchedFilmCard.classList.add("has-poster");
        } else {
            heroInner.classList.remove("has-results");
            searchedFilmCard.classList.remove("has-poster");
        }

        // "X için öneriler" – film adı italik
        resultsTitle.innerHTML = "";
        const em = document.createElement("span");
        em.className = "film-name";
        em.textContent = data.film;
        resultsTitle.appendChild(em);
        resultsTitle.appendChild(document.createTextNode(" için öneriler"));

        recommendedGrid.innerHTML = "";

        // Her film için asenkron olarak IMDb puanını al
        data.oneriler.forEach(async (item, index) => {
            const card = document.createElement("article");
            card.className = "movie-card";

            // YENİ: "Bilinmiyor" kontrolü
            const movieYear = item.year && item.year !== "Bilinmiyor" ? item.year : '';

            // Tür etiketlerini oluştur - DÜZELTİLMİŞ VERSİYON
            let genreTags = '<span class="genre-tag">Film</span>';
            if (item.genres && item.genres.length > 0) {
                const validGenres = item.genres.filter(genre => genre && genre !== "Bilinmiyor");
                if (validGenres.length > 0) {
                    genreTags = validGenres.slice(0, 2).map(genre =>
                        `<span class="genre-tag">${safeHtml(genre)}</span>`
                    ).join('');
                }
            }

            // Başlangıç HTML'si - puan yüklenirken gösterilecek
            card.innerHTML = `
                <img src="${safeHtml(item.poster)}" alt="${safeHtml(item.title)}" loading="lazy">
                <div class="movie-info">
                    <h3 class="movie-title">${safeHtml(item.title)}</h3>
                    <div class="movie-meta">
                        <div class="movie-genres">
                            ${genreTags}
                        </div>
                        <div class="movie-year-rating">
                            <span class="movie-year">${movieYear}</span>
                            <span class="movie-rating">
                                <span class="rating-loading">Puan yükleniyor...</span>
                            </span>
                        </div>
                        <p class="movie-overview">${safeHtml(item.overview || '')}</p>
                    </div>
                </div>
            `;

            // Filme tıklanınca detayları aç
            card.addEventListener('click', () => {
                showMovieDetails(item);
            });

            recommendedGrid.appendChild(card);

            // IMDb puanını asenkron olarak yükle
            const movieData = allMoviesData.find(movie => movie.title === item.title);
            if (movieData && movieData.id) {
                const imdbRating = await getIMDbRating(item.title, movieData.id);

                // Puanı güncelle
                const ratingElement = card.querySelector('.movie-rating');
                if (ratingElement) {
                    if (imdbRating) {
                        const starRating = getStarRating(imdbRating);
                        ratingElement.innerHTML = starRating;
                    } else {
                        ratingElement.innerHTML = '<span class="no-rating">Puan yok</span>';
                    }
                }
            }
        });

        resultsSection.hidden = false;
    }

    // Yıldız puanını yıldız ikonlarına çevir
    function getStarRating(voteAverage) {
        const rating = parseFloat(voteAverage) || 0;
        const fullStars = Math.floor(rating / 2);
        const hasHalfStar = (rating / 2 - fullStars) >= 0.5;

        let stars = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i === fullStars && hasHalfStar) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }

        // Sayısal puanı da ekle
        return stars + ` <span class="rating-number">${rating.toFixed(1)}</span>`;
    }

    // ESKİ FONKSİYONU KALDIRDIK - yerine safeHtml kullanıyoruz
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // YENİ: Highlight fonksiyonu - güvenli versiyon
    function highlightMatch(text, query) {
        if (!text || !query) return safeHtml(text || '');

        const textStr = String(text);
        const queryStr = String(query);
        const escapedQuery = escapeRegex(queryStr);

        try {
            const regex = new RegExp(`(${escapedQuery})`, 'gi');
            const escapedText = safeHtml(textStr);
            return escapedText.replace(regex, '<span class="highlight">$1</span>');
        } catch (error) {
            console.error('Highlight hatası:', error);
            return safeHtml(textStr);
        }
    }

    function showAutocompleteDropdown() {
        autocompleteDropdown.classList.add('show');
    }

    function hideAutocompleteDropdown() {
        autocompleteDropdown.classList.remove('show');
        selectedAutocompleteIndex = -1;
    }

    // TMDB'den film posterini getiren fonksiyon
    async function getPosterForMovie(movieTitle, movieId) {
        const cacheKey = movieTitle.toLowerCase();
        if (posterCache.has(cacheKey)) {
            return posterCache.get(cacheKey);
        }

        if (movieId) {
            try {
                const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=tr-TR`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();
                    if (data.poster_path) {
                        posterCache.set(cacheKey, data.poster_path);
                        return data.poster_path;
                    }
                }
            } catch (error) {
                console.log('Poster alınamadı:', movieTitle, error);
            }
        }

        return null;
    }

    // DÜZELTİLMİŞ: Otomatik tamamlama fonksiyonu (IMDb puanı ile) - FIXED!
    async function updateAutocomplete(query) {
        if (!query || !query.trim()) {
            hideAutocompleteDropdown();
            return;
        }

        const queryLower = query.toLowerCase().trim();

        const filteredMovies = allMoviesData.filter(movie => {
            if (!movie || !movie.title) return false;
            const movieLower = String(movie.title).toLowerCase();
            return movieLower.includes(queryLower);
        })
        .sort((a, b) => {
            const aLower = String(a.title).toLowerCase();
            const bLower = String(b.title).toLowerCase();

            const aStarts = aLower.startsWith(queryLower);
            const bStarts = bLower.startsWith(queryLower);

            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return String(a.title).length - String(b.title).length;
        })
        .slice(0, 8);

        currentAutocompleteItems = filteredMovies;

        if (filteredMovies.length === 0) {
            hideAutocompleteDropdown();
            return;
        }

        // Önce dropdown'ı temizle
        autocompleteDropdown.innerHTML = '';

        // Her film için öğe oluştur
        for (const movie of filteredMovies) {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.value = movie.title;

            // Film yılı - "Bilinmiyor" kontrolü
            let year = '';
            if (movie.release_date) {
                year = movie.release_date.substring(0, 4);
            } else if (movie.year && movie.year !== "Bilinmiyor") {
                year = movie.year;
            }

            // Vurgulanmış başlık
            const highlightedTitle = highlightMatch(movie.title, query);

            // Poster'i ve puanı asenkron olarak yükle
            const posterPath = await getPosterForMovie(movie.title, movie.id);
            const imdbRating = await getIMDbRating(movie.title, movie.id);

            // Poster HTML'i - DÜZELTİLMİŞ: inline event handler kaldırıldı
            let posterHtml;
            if (posterPath) {
                const img = document.createElement('img');
                img.src = `https://image.tmdb.org/t/p/w92${posterPath}`;
                img.alt = safeHtml(movie.title);
                img.className = 'movie-poster-small';
                // Resim yüklenemezse fallback
                img.onerror = function() {
                    this.onerror = null;
                    this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="60" viewBox="0 0 40 60"><rect width="40" height="60" fill="#222" rx="4"/><text x="20" y="30" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">?</text></svg>';
                };
                posterHtml = img.outerHTML;
            } else {
                posterHtml = `<div class="movie-poster-small" style="background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: #999;">
                     <i class="fas fa-film"></i>
                   </div>`;
            }

            // Puan HTML'i
            let ratingHtml = '';
            if (imdbRating) {
                ratingHtml = `<span class="autocomplete-rating">
                     <i class="fas fa-star"></i>
                     ${safeHtml(imdbRating)}
                   </span>`;
            }

            // DÜZELTİLMİŞ: innerHTML yerine DOM manipulation
            const posterContainer = document.createElement('div');
            posterContainer.innerHTML = posterHtml;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'movie-info-small';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'movie-title-small';
            titleDiv.innerHTML = highlightedTitle;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'movie-meta-small';

            const yearSpan = document.createElement('span');
            yearSpan.className = 'movie-year-small';
            yearSpan.textContent = year;

            metaDiv.appendChild(yearSpan);

            if (ratingHtml) {
                const ratingContainer = document.createElement('div');
                ratingContainer.innerHTML = ratingHtml;
                metaDiv.appendChild(ratingContainer.firstChild);
            }

            infoDiv.appendChild(titleDiv);
            infoDiv.appendChild(metaDiv);

            item.appendChild(posterContainer.firstChild);
            item.appendChild(infoDiv);

            // Tıklama olayı
            item.addEventListener('click', () => {
                movieInput.value = movie.title;
                hideAutocompleteDropdown();
                movieInput.focus();
                if (clearButton) {
                    clearButton.classList.add('visible');
                }
            });

            item.addEventListener('mouseenter', (e) => {
                const items = document.querySelectorAll('.autocomplete-item');
                const index = Array.from(items).indexOf(e.currentTarget);
                setActiveAutocompleteItem(index);
            });

            autocompleteDropdown.appendChild(item);
        }

        showAutocompleteDropdown();
        setActiveAutocompleteItem(-1);
    }

    function setActiveAutocompleteItem(index) {
        document.querySelectorAll('.autocomplete-item.active').forEach(item => {
            item.classList.remove('active');
        });

        if (index >= 0 && index < currentAutocompleteItems.length) {
            const items = document.querySelectorAll('.autocomplete-item');
            if (items[index]) {
                items[index].classList.add('active');
                selectedAutocompleteIndex = index;
            }
        }
    }

    function selectActiveAutocompleteItem() {
        if (selectedAutocompleteIndex >= 0 && selectedAutocompleteIndex < currentAutocompleteItems.length) {
            const movie = currentAutocompleteItems[selectedAutocompleteIndex];
            movieInput.value = movie.title;
            hideAutocompleteDropdown();
            movieInput.focus();
            if (clearButton) {
                clearButton.classList.add('visible');
            }
        }
    }

    // Film detaylarını modalda göster
    async function showMovieDetails(item) {
        modalTitle.textContent = item.title;
        modalPoster.src = item.poster;
        modalPoster.alt = item.title;

        // "Bilinmiyor" kontrolü
        const genres = item.genres && item.genres.length > 0
            ? item.genres.filter(g => g && g !== "Bilinmiyor").join(', ')
            : 'Yükleniyor...';

        const year = item.year && item.year !== "Bilinmiyor" ? item.year : 'Yükleniyor...';
        const runtime = item.runtime && item.runtime !== "Bilinmiyor" ? `${item.runtime} dakika` : 'Yükleniyor...';

        modalGenres.textContent = genres;
        modalReleaseDate.textContent = year;
        modalRuntime.textContent = runtime;

        // IMDb puanını göster
        const movieData = allMoviesData.find(movie => movie.title === item.title);
        if (movieData && movieData.id) {
            const imdbRating = await getIMDbRating(item.title, movieData.id);
            modalRating.textContent = imdbRating ? `★ ${imdbRating}/10` : 'Puan yok';
        } else {
            modalRating.textContent = 'Puan yok';
        }

        modalOverview.textContent = item.overview || 'Yükleniyor...';

        movieModal.classList.add('show');
        document.body.style.overflow = 'hidden';

        try {
            const movieData = allMoviesData.find(movie => movie.title === item.title);
            if (movieData && movieData.id) {
                const url = `https://api.themoviedb.org/3/movie/${movieData.id}?api_key=${TMDB_API_KEY}&language=tr-TR`;
                const response = await fetch(url);

                if (response.ok) {
                    const data = await response.json();

                    const releaseDate = data.release_date ? new Date(data.release_date).toLocaleDateString('tr-TR') : year;
                    const runtime = data.runtime ? `${data.runtime} dakika` : runtime;
                    const genres = data.genres ? data.genres.map(g => g.name).join(', ') : genres;
                    const overview = data.overview || item.overview || 'Özet bulunamadı.';

                    modalReleaseDate.textContent = releaseDate;
                    modalRuntime.textContent = runtime;
                    modalGenres.textContent = genres;
                    modalOverview.textContent = overview;
                }
            }
        } catch (error) {
            console.log('Ek detaylar alınamadı:', error);
        }
    }

    function closeMovieModal() {
        movieModal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    async function loadMovieList() {
        try {
            const res = await fetch(API_BASE + "/movies");
            if (!res.ok) return;
            const data = await res.json();
            allMovies = data.movies || [];

            try {
                const moviesRes = await fetch(API_BASE + "/all_movies");
                if (moviesRes.ok) {
                    const moviesData = await moviesRes.json();
                    allMoviesData = moviesData.movies || [];

                    console.log("Yüklenen filmler (ilk 5):", allMoviesData.slice(0, 5));

                    // Verileri temizle: "Bilinmiyor" kontrolü
                    allMoviesData = allMoviesData.map(movie => {
                        if (movie.year === "Bilinmiyor") movie.year = '';
                        if (movie.genres && Array.isArray(movie.genres)) {
                            movie.genres = movie.genres.filter(genre => genre && genre !== "Bilinmiyor");
                        }
                        return movie;
                    });

                    allMoviesData.forEach(movie => {
                        if (movie.poster_path) {
                            posterCache.set(movie.title.toLowerCase(), movie.poster_path);
                        }
                    });
                }
            } catch (e) {
                console.warn("Tam film listesi yüklenemedi:", e);
            }
        } catch (err) {
            console.warn("Film listesi yüklenemedi:", err);
        }
    }

    async function getRecommendations() {
        const query = movieInput.value.trim();
        if (!query) {
            showError("Lütfen bir film adı girin.");
            movieInput.focus();
            return;
        }

        showError("");
        setLoading(true);
        hideAutocompleteDropdown();

        try {
            const url = API_BASE + "/recommend/" + encodeURIComponent(query);
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 404) {
                    showError("Film bulunamadı. Lütfen listeden seçin veya tam adı yazın.");
                } else {
                    showError("Bir hata oluştu. Lütfen tekrar deneyin.");
                }
                setLoading(false);
                return;
            }

            // Backend'den gelen veriyi temizle
            if (data.oneriler) {
                data.oneriler = data.oneriler.map(item => {
                    if (item.year === "Bilinmiyor") item.year = '';
                    if (item.genres && Array.isArray(item.genres)) {
                        item.genres = item.genres.filter(genre => genre && genre !== "Bilinmiyor");
                    }
                    return item;
                });
            }

            renderResults(data);
        } catch (err) {
            showError("Sunucuya bağlanılamadı. Lütfen sunucunun çalıştığından emin olun.");
            console.error(err);
        }

        setLoading(false);
    }

    // Event Listeners
    searchBtn.addEventListener("click", getRecommendations);

    if (clearButton) {
        clearButton.addEventListener("click", function() {
            movieInput.value = '';
            movieInput.focus();
            clearButton.classList.remove('visible');
            hideAutocompleteDropdown();
            showError('');
        });
    }

    movieInput.addEventListener("input", function () {
        showError("");

        if (clearButton) {
            if (this.value.length > 0) {
                clearButton.classList.add('visible');
            } else {
                clearButton.classList.remove('visible');
            }
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateAutocomplete(this.value);
        }, 150);
    });

    movieInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            if (autocompleteDropdown.classList.contains('show') && selectedAutocompleteIndex >= 0) {
                selectActiveAutocompleteItem();
                e.preventDefault();
            } else {
                getRecommendations();
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (autocompleteDropdown.classList.contains('show')) {
                const nextIndex = Math.min(selectedAutocompleteIndex + 1, currentAutocompleteItems.length - 1);
                setActiveAutocompleteItem(nextIndex);

                const activeItem = document.querySelector('.autocomplete-item.active');
                if (activeItem) {
                    activeItem.scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (autocompleteDropdown.classList.contains('show')) {
                const prevIndex = Math.max(selectedAutocompleteIndex - 1, 0);
                setActiveAutocompleteItem(prevIndex);

                const activeItem = document.querySelector('.autocomplete-item.active');
                if (activeItem) {
                    activeItem.scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === "Escape") {
            hideAutocompleteDropdown();
        }
    });

    closeModal.addEventListener("click", closeMovieModal);
    closeModalBtn.addEventListener("click", closeMovieModal);

    movieModal.addEventListener("click", function (e) {
        if (e.target.classList.contains('modal-overlay')) {
            closeMovieModal();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && movieModal.classList.contains('show')) {
            closeMovieModal();
        }
    });

    document.addEventListener('click', function (e) {
        if (movieInput && autocompleteDropdown) {
            if (!movieInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
                hideAutocompleteDropdown();
            }
        }
    });

    window.addEventListener('DOMContentLoaded', loadMovieList);
})();