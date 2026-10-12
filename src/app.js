require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const characterRoutes = require('./routes/characterRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Configuração de CORS
const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Parsers de requisição
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com banco sob demanda (essencial para ambientes serverless como Vercel)
app.use(async (req, res, next) => {
  // O endpoint de healthcheck avalia o status sem forçar bloqueio se o DB estiver fora
  if (req.path === '/api/health') {
    return next();
  }

  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (error) {
      return res.status(503).json({
        success: false,
        error: 'Serviço temporariamente indisponível: falha na conexão com o banco de dados.',
        details: error.message,
      });
    }
  }

  next();
});

// Endpoint de Health Check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'healthy',
    message: 'API do Sistema de Cartas de Personagens está operacional.',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Rotas da API
app.use('/api/characters', characterRoutes);

// Rota raiz informativa
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Game Cards API',
    description: 'API REST para gerenciamento de cartas colecionáveis de personagens de videogame.',
    healthCheck: '/api/health',
    endpoints: {
      characters: '/api/characters',
    },
    documentation: 'Consulte api.md para mais informações.',
  });
});

// Tratamento de rotas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// Middleware centralizado de tratamento de erros
app.use(errorHandler);

module.exports = app;
