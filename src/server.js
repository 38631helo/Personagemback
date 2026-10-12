const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.MONGODB_URI) {
      await connectDB();
    } else {
      console.warn(' AVISO: MONGODB_URI não foi informada. As rotas que dependem do banco responderão com erro até que o MongoDB seja configurado.');
    }

    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🎮 Game Cards API inicializada com sucesso!`);
      console.log(`📡 URL Local: http://localhost:${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🃏 Personagens: http://localhost:${PORT}/api/characters`);
      console.log(`⚙️  Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===============================================`);
    });

    // Encerramento gracioso
    const gracefulShutdown = () => {
      console.log('\n Fechando servidor HTTP...');
      server.close(() => {
        console.log(' Servidor HTTP finalizado.');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    console.error(' Falha crítica ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();
