const express = require('express');
const path = require('path');
const axios = require('axios');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();

// Habilitar CORS para que Stremio pueda acceder al Addon
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    next();
});

// Servir archivos estáticos (Logo e imágenes)
app.use(express.static(path.join(__dirname, '..')));

const API_KEY = process.env.TMDB_API_KEY || '';
const BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const DEFAULT_POSTER_URL = 'https://via.placeholder.com/500x750?text=No+Image'; // Placeholder for missing posters

// Géneros populares para la barra de navegación
const GENRES_LIST = {
    movie: [
        { id: 28, name: 'Acción' }, { id: 12, name: 'Aventura' }, { id: 16, name: 'Animación' },
        { id: 35, name: 'Comedia' }, { id: 80, name: 'Crimen' }, { id: 99, name: 'Documental' },
        { id: 18, name: 'Drama' }, { id: 10751, name: 'Familia' }, { id: 14, name: 'Fantasía' },
        { id: 36, name: 'Historia' }, { id: 27, name: 'Terror' }, { id: 10402, name: 'Música' },
        { id: 9648, name: 'Misterio' }, { id: 10749, name: 'Romance' }, { id: 878, name: 'Ciencia ficción' },
        { id: 53, name: 'Suspenso' }, { id: 10752, name: 'Bélica' }, { id: 37, name: 'Western' }
    ],
    tv: [
        { id: 10759, name: 'Acción & Aventura' }, { id: 16, name: 'Animación' }, { id: 35, name: 'Comedia' },
        { id: 80, name: 'Crimen' }, { id: 99, name: 'Documental' }, { id: 18, name: 'Drama' },
        { id: 10751, name: 'Familia' }, { id: 10762, name: 'Infantil' }, { id: 9648, name: 'Misterio' },
        { id: 10763, name: 'Noticias' }, { id: 10764, name: 'Reality' }, { id: 10765, name: 'Sci-Fi & Fantasy' },
        { id: 10766, name: 'Telenovela' }, { id: 10767, name: 'Talk' }, { id: 10768, name: 'War & Politics' },
        { id: 37, name: 'Western' }
    ],
    anime: [
        { id: 10759, name: 'Acción' }, { id: 12, name: 'Aventura' }, { id: 35, name: 'Comedia' },
        { id: 18, name: 'Drama' }, { id: 10765, name: 'Fantasía' }, { id: 9648, name: 'Misterio' },
        { id: 10749, name: 'Romance' }, { id: 878, name: 'Sci-Fi' }, { id: 10762, name: 'Infantil' },
        { id: 53, name: 'Thriller' }
    ]
};

// Configuración de plantillas (Layout moderno)
const layout = (title, content, description = 'Descubre películas, series y animes en ultrapelis0.') => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <title>${title} | ultrapelis0</title>
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <link rel="shortcut icon" href="/logo.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/logo.svg">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: 'Inter', sans-serif; }
        .movie-card { transition: transform 0.2s ease-in-out; }
        .movie-card:hover { transform: translateY(-5px); }
        .video-aspect { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 0.75rem; }
        .video-aspect iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body class="p-4 md:p-8">
    <nav class="flex flex-col md:flex-row justify-between items-center mb-8 max-w-6xl mx-auto gap-4">
        <div class="flex items-center gap-8">
            <a href="/" class="flex items-center gap-2 group">
                <div class="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-500 transition-colors">
                    <img src="/logo.svg" alt="Logo" class="h-6 w-6" onerror="this.src='https://www.themoviedb.org/favicon.ico'">
                </div>
                <span class="text-2xl font-black tracking-tighter uppercase">ultra<span class="text-indigo-500">pelis</span><span class="text-white/50">0</span></span>
            </a>
            <div class="hidden md:flex gap-4 text-sm font-medium text-gray-400">
                <a href="/" class="hover:text-white transition-colors duration-200">Inicio</a>
                <a href="/?type=movie" class="hover:text-white transition-colors duration-200">Películas</a>
                <a href="/?type=tv" class="hover:text-white transition-colors duration-200">Series</a>
                <a href="/?type=anime" class="hover:text-white transition-colors duration-200">Anime</a>
            </div>
        </div>
        <form action="/search" method="GET" class="flex gap-2 w-full md:w-auto">
            <input name="q" type="text" placeholder="Buscar película o serie..." class="flex-grow bg-gray-800 p-2 rounded border border-gray-700 focus:outline-none focus:border-indigo-500 text-sm">
            <button class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-sm font-bold transition-colors duration-200">Buscar</button>
        </form>
    </nav>
    <main class="max-w-6xl mx-auto">${content}</main>
    <footer class="mt-12 text-center text-gray-500 border-t border-gray-800 pt-6">
        <p>&copy; ${new Date().getFullYear()} ultrapelis0 - <span class="text-indigo-400">v2.5 (Más Servidores TV)</span></p>
        <div class="mt-4">
            <a href="stremio://ultrapelis0.vercel.app/manifest.json" class="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-4 rounded-full transition-all inline-flex items-center gap-2">
                <span>+</span> Instalar Addon en Stremio
            </a>
        </div>
    </footer>
</body>
</html>
`;

// --- SECCIÓN ADDON STREMIO ---
app.get('/manifest.json', (req, res) => {
    res.json({
        id: 'org.ultrapelis0.v5',
        version: '2.5.0',
        name: 'ultrapelis0 VIP',
        description: 'Ver contenido de ultrapelis0 directamente en Stremio.',
        resources: ['catalog', 'stream'],
        types: ['movie', 'series'],
        idPrefixes: ['tmdb', 'tt'],
        catalogs: [
            {
                type: 'movie',
                id: 'ultrapelis_movies',
                name: 'ultrapelis0 - Películas'
            },
            {
                type: 'series',
                id: 'ultrapelis_series',
                name: 'ultrapelis0 - Series'
            }
        ]
    });
});

app.get('/catalog/:type/:id.json', async (req, res) => {
    const { type } = req.params;
    try {
        let url = `${BASE_URL}/discover/${type === 'series' ? 'tv' : 'movie'}?api_key=${API_KEY}&language=es-MX&sort_by=popularity.desc`;
        const resp = await axios.get(url);
        const metas = resp.data.results.map(m => ({
            id: `tmdb:${m.id}`,
            type: type === 'series' ? 'series' : 'movie',
            name: m.title || m.name,
            poster: TMDB_IMAGE_BASE_URL + m.poster_path,
            description: m.overview
        }));
        res.json({ metas });
    } catch (e) {
        res.json({ metas: [] });
    }
});

app.get('/stream/:type/:id.json', (req, res) => {
    const type = req.params.type === 'series' ? 'tv' : 'movie';
    const id = req.params.id;
    const parts = id.split(':');
    const mainId = parts[0].replace('tmdb:', '');
    const s = parts[1] || 1;
    const e = parts[2] || 1;

    let vidsrcQuery = mainId.startsWith('tt') ? `imdb=${mainId}` : `tmdb=${mainId}`;
    if (type === 'tv') vidsrcQuery += `&sea=${s}&epi=${e}`;

    const streams = [
        { 
            title: '🚀 Opción 1 (Multi/Sub)', 
            externalUrl: `https://vidsrc.me/embed/${type}?tmdb=${mainId}${type === 'tv' ? `&sea=${s}&epi=${e}` : ''}` 
        }
    ];

    if (!mainId.startsWith('tt')) {
        streams.push({ 
            title: '🇲🇽 Opción 2 (Latino)', 
            externalUrl: `https://embed.su/embed/${type}/${mainId}${type === 'tv' ? `/${s}/${e}` : ''}`
        });
        streams.push({
            title: '📺 Opción 3 (2embed.cc)',
            externalUrl: `https://2embed.cc/embed/${type === 'movie' ? '' : 'series/'}${mainId}${type === 'tv' ? `/${s}/${e}` : ''}`
        });
    }

    // Ordenar las opciones para que la Multi/Sub sea la primera
    streams.sort((a, b) => a.title.localeCompare(b.title));

    res.json({ streams });
});

// RUTA: Inicio (Películas Populares)
app.get('/', async (req, res) => {
    const type = req.query.type || 'all';
    const genreId = req.query.genre || '';

    if (!API_KEY || API_KEY === '') {
        console.error("FALTA TMDB_API_KEY en las variables de entorno");
        return res.status(500).send("Configuración incompleta: Falta la API Key en el Dashboard de Vercel.");
    }

    try {
        // Construcción de URLs con filtros de género y origen
        const genreParam = genreId ? `&with_genres=${genreId}` : '';
        
        let movieUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=es-MX&sort_by=popularity.desc${genreParam}`;
        let tvUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=es-MX&sort_by=popularity.desc${genreParam}`;
        // Anime: Género 16 (Animación) + País de origen JP (Japón)
        let animeUrl = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=es-MX&with_genres=16${genreId ? ',' + genreId : ''}&with_origin_country=JP&sort_by=popularity.desc`;

        const [movies, tvShows, animes] = await Promise.all([
            axios.get(movieUrl).then(r => r.data.results).catch((err) => { console.error("Error Movies:", err.message); return []; }),
            axios.get(tvUrl).then(r => r.data.results).catch((err) => { console.error("Error TV:", err.message); return []; }),
            axios.get(animeUrl).then(r => r.data.results).catch((err) => { console.error("Error Anime:", err.message); return []; })
        ]);

        // Generar barra de géneros
        let genreBar = '';
        if (type !== 'all') {
            const list = GENRES_LIST[type] || [];
            genreBar = `
                <div class="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-6">
                    <a href="/?type=${type}" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase transition ${!genreId ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700 shadow-lg shadow-indigo-500/20'}">Todos</a>
                    ${list.map(g => `
                        <a href="/?type=${type}&genre=${g.id}" class="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold uppercase transition ${genreId == g.id ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'}">${g.name}</a>
                    `).join('')}
                </div>
            `;
        }

        const renderSection = (title, items, mediaType) => `
            <h2 class="text-2xl font-semibold mb-6 mt-10">${title}</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                ${items.slice(0, 10).map(m => `
                    <a href="/${mediaType}/${m.id}" class="movie-card block">
                        <img src="${m.poster_path ? TMDB_IMAGE_BASE_URL + m.poster_path : DEFAULT_POSTER_URL}" alt="${m.title || m.name}" class="rounded-lg shadow-lg aspect-[2/3] object-cover">
                        <h3 class="mt-2 text-sm font-medium truncate">${m.title || m.name}</h3>
                        <span class="text-xs text-gray-400">${(m.release_date || m.first_air_date || '').split('-')[0]}</span>
                    </a>
                `).join('')}
            </div>
        `;

        let html = genreBar;
        if (type === 'all' || type === 'movie') html += renderSection('Películas Populares', movies, 'movie');
        if (type === 'all' || type === 'tv') html += renderSection('Series de TV', tvShows, 'tv');
        if (type === 'all' || type === 'anime') html += renderSection('Animes Japoneses', animes, 'tv');

        if (movies.length === 0 && tvShows.length === 0 && animes.length === 0) {
            html = '<div class="text-center py-20"><h2 class="text-xl text-gray-400">No se pudieron cargar los datos de TMDB. Revisa los logs de Vercel y los scopes de tu API Key.</h2></div>';
        }

        res.send(layout('Inicio', html));
    } catch (error) {
        console.error("Error en ruta Inicio:", error.response ? error.response.data : error.message);
        res.status(500).send("Error al cargar TMDB. Verifica tu API Key.");
    }
});

// RUTA: Buscador
app.get('/search', async (req, res) => {
    const query = req.query.q || '';
    if (!API_KEY) {
        console.error("FALTA TMDB_API_KEY en las variables de entorno");
        return res.status(500).send("API Key no configurada.");
    }

    if (!query) return res.redirect('/');
    try {
        const resp = await axios.get(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}&language=es-MX`);
        const results = resp.data.results || [];

        const html = `
            <h2 class="text-2xl font-semibold mb-6">Resultados para: ${query}</h2>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-6">
                ${results.length > 0 ? results.filter(m => m.media_type !== 'person').map(m => `
                    <a href="/${m.media_type}/${m.id}" class="movie-card">
                        <img src="${m.poster_path ? TMDB_IMAGE_BASE_URL + m.poster_path : DEFAULT_POSTER_URL}" class="rounded-lg aspect-[2/3] object-cover">
                        <h3 class="mt-2 text-sm truncate">${m.title || m.name}</h3>
                        <span class="text-xs text-gray-500 uppercase">${m.media_type === 'tv' ? 'Serie' : 'Película'}</span>
                    </a>
                `).join('') : '<p class="col-span-full text-center text-gray-500 py-12">No se encontraron resultados para tu búsqueda.</p>'}
            </div>
        `;
        res.send(layout(`Resultados: ${query}`, html));
    } catch (error) {
        console.error("Error en Buscador:", error.message);
        res.send("Error en la búsqueda.");
    }
});

// RUTA: Reproductor (Movie Detail)
app.get('/movie/:id', async (req, res) => {
    const id = req.params.id;
    if (!API_KEY) {
        return res.status(500).send("API Key no configurada.");
    }

    try {
        const resp = await axios.get(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=es-MX`);
        const movie = resp.data;

        // Definir URLs de los servidores
        const vidsrcUrl = `https://vidsrc.me/embed/movie?tmdb=${id}`;
        const embedSuUrl = `https://embed.su/embed/movie/${id}`;
        const vidsrcCcUrl = `https://vidsrc.cc/v2/embed/movie/${id}`;
        const vidsrcProUrl = `https://vidsrc.pro/embed/movie/${id}`;
        const twoEmbedUrl = `https://2embed.cc/embed/${id}`;

        const html = `
            <div class="grid md:grid-cols-3 gap-8">
                <div class="md:col-span-2">
                    <div class="flex flex-wrap gap-2 mb-6 p-2 bg-gray-900/80 backdrop-blur rounded-lg border border-white/5">
                        <button onclick="setServer('${vidsrcUrl}', this)" class="server-btn bg-indigo-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider">Opción 1</button>
                        <button onclick="setServer('${embedSuUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 2 (Latino)</button>
                        <button onclick="setServer('${vidsrcCcUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 3</button>
                        <button onclick="setServer('${vidsrcProUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition border border-indigo-500/50">Opción 4 (TV/Stremio)</button>
                        <button onclick="setServer('${twoEmbedUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 5 (2embed)</button>
                    </div>
                    <div class="video-aspect bg-black rounded-xl overflow-hidden shadow-2xl">
                        <iframe id="player" src="${vidsrcUrl}" allowfullscreen frameborder="0" referrerpolicy="no-referrer" allow="autoplay; encrypted-media" sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-presentation"></iframe>
                    </div>
                    <script>
                        function setServer(url, btn) {
                            document.getElementById('player').src = url;
                            document.querySelectorAll('.server-btn').forEach(b => {
                                b.classList.remove('bg-indigo-600');
                                b.classList.add('bg-gray-700');
                            });
                            btn.classList.remove('bg-gray-700');
                            btn.classList.add('bg-indigo-600');
                        }
                    </script>
                    <h1 class="text-3xl font-bold mt-6">${movie.title}</h1>
                    <p class="text-gray-400 mt-4 leading-relaxed">${movie.overview}</p>
                </div>
                <div class="bg-gray-800 p-6 rounded-xl h-fit">
                    <img src="${movie.poster_path ? TMDB_IMAGE_BASE_URL + movie.poster_path : DEFAULT_POSTER_URL}" class="rounded mb-4 w-full">
                    <p><strong>⭐ Calificación:</strong> ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</p>
                    <p><strong>📅 Lanzamiento:</strong> ${movie.release_date}</p>
                    <p class="mt-4 text-xs text-gray-500 italic">Nota: Los servidores de video son externos.</p>
                </div>
            </div>
        `;
        res.send(layout(movie.title, html));
    } catch (error) {
        res.status(404).send("Película no encontrada.");
    }
});

// RUTA: Reproductor para Series/Anime
app.get('/tv/:id', async (req, res) => {
    const id = req.params.id;
    const s = req.query.s || 1;
    const e = req.query.e || 1;

    if (!API_KEY) {
        return res.status(500).send("API Key no configurada.");
    }

    try {
        const resp = await axios.get(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-MX`);
        const tv = resp.data;

        const vidsrcUrl = `https://vidsrc.me/embed/tv?tmdb=${id}&sea=${s}&epi=${e}`;
        const embedSuUrl = `https://embed.su/embed/tv/${id}/${s}/${e}`;
        const vidsrcCcUrl = `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`;
        const vidsrcProUrl = `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`;
        const twoEmbedUrl = `https://2embed.cc/embed/series/${id}/${s}/${e}`;

        const html = `
            <div class="grid md:grid-cols-3 gap-8">
                <div class="md:col-span-2">
                    <div class="flex flex-wrap gap-2 mb-4 items-center p-2 bg-gray-900/80 backdrop-blur rounded-lg border border-white/5">
                        <button onclick="setServer('${vidsrcUrl}', this)" class="server-btn bg-indigo-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider">Opción 1</button>
                        <button onclick="setServer('${embedSuUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 2 (Latino)</button>
                        <button onclick="setServer('${vidsrcCcUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 3</button>
                        <button onclick="setServer('${vidsrcProUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition border border-indigo-500/50">Opción 4 (TV/Stremio)</button>
                        <button onclick="setServer('${twoEmbedUrl}', this)" class="server-btn bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition">Opción 5 (2embed)</button>
                        
                        <div class="flex gap-2 ml-auto">
                            <select onchange="changeEpisode(this.value, ${e})" class="bg-gray-800 border border-gray-700 p-2 rounded text-sm">
                                ${Array.from({length: tv.number_of_seasons}, (_, i) => `<option value="${i+1}" ${s == i+1 ? 'selected' : ''}>Temporada ${i+1}</option>`).join('')}
                            </select>
                            <input type="number" value="${e}" min="1" onchange="changeEpisode(${s}, this.value)" class="bg-gray-800 border border-gray-700 p-2 rounded text-sm w-20" placeholder="Ep.">
                        </div>
                    </div>

                    <div class="video-aspect bg-black rounded-xl overflow-hidden shadow-2xl">
                        <iframe id="player" src="${vidsrcUrl}" allowfullscreen frameborder="0" referrerpolicy="no-referrer" allow="autoplay; encrypted-media" sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation allow-presentation"></iframe>
                    </div>

                    <script>
                        function setServer(url, btn) {
                            document.getElementById('player').src = url;
                            document.querySelectorAll('.server-btn').forEach(b => {
                                b.classList.remove('bg-indigo-600');
                                b.classList.add('bg-gray-700');
                            });
                            btn.classList.remove('bg-gray-700');
                            btn.classList.add('bg-indigo-600');
                        }
                        function changeEpisode(s, e) {
                            window.location.href = \`/tv/${id}?s=\${s}&e=\${e}\`;
                        }
                    </script>

                    <h1 class="text-3xl font-bold mt-6">${tv.name} (T${s} : E${e})</h1>
                    <p class="text-gray-400 mt-4 leading-relaxed">${tv.overview}</p>
                </div>
                
                <div class="bg-gray-800 p-6 rounded-xl h-fit">
                    <img src="${tv.poster_path ? TMDB_IMAGE_BASE_URL + tv.poster_path : DEFAULT_POSTER_URL}" class="rounded mb-4 w-full">
                    <div class="space-y-2 text-sm">
                        <p><strong>⭐ Calificación:</strong> ${tv.vote_average ? tv.vote_average.toFixed(1) : 'N/A'}</p>
                        <p><strong>📺 Estado:</strong> ${tv.status}</p>
                        <p><strong>🔢 Total Temporadas:</strong> ${tv.number_of_seasons}</p>
                        <p><strong>🎬 Géneros:</strong> ${tv.genres.map(g => g.name).join(', ')}</p>
                    </div>
                </div>
            </div>
        `;
        res.send(layout(tv.name, html));
    } catch (error) {
        res.status(404).send("Serie no encontrada.");
    }
});

// Exportar de forma que Vercel y Netlify lo entiendan sin errores
module.exports = app;
module.exports.handler = serverless(app);

// Mantener el listen solo para desarrollo local
if (!process.env.VERCEL && !process.env.NETLIFY && process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Local: http://localhost:${PORT}`));
}
