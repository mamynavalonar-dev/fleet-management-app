import axios from 'axios';

// Configuration de base pour toutes les requêtes
const client = axios.create({
  baseURL: 'http://localhost:5000/api', // L'adresse de votre backend Node.js
  headers: {
    'Content-Type': 'application/json',
  },
});

export default client;
