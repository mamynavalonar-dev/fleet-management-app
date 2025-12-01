import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Intercepteur de REQUÊTE : Injecte le token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Intercepteur de RÉPONSE : Gère les erreurs 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si pas de réponse serveur (ex: serveur éteint), on rejette tout de suite
    if (!error.response) {
      return Promise.reject(error);
    }

    const { status } = error.response;
    const originalRequestUrl = error.config.url;

    // Détection spécifique : Est-ce une tentative de connexion ?
    // On vérifie si l'URL contient "login" pour ne JAMAIS rediriger dans ce cas
    const isLoginAttempt = originalRequestUrl.includes('/auth/login');

    if (status === 401 && !isLoginAttempt) {
      // C'est une autre requête (ex: /vehicles) qui a échoué -> On déconnecte
      console.warn("Session expirée, redirection vers login.");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Pour le login (isLoginAttempt === true), on ne fait RIEN ici.
    // On laisse l'erreur remonter vers la page LoginPage pour afficher "Mot de passe incorrect".
    return Promise.reject(error);
  }
);

export default client;