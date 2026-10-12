const mongoose = require('mongoose');

/**
 * Cache de conexão para reutilização em ambientes Serverless (como Vercel)
 * e servidores tradicionais. Evita estouro de conexões simultâneas.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('A variável de ambiente MONGODB_URI não foi configurada.');
  }

  // Se já houver conexão ativa, reutiliza
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Se já houver promessa de conexão em andamento, aguarda
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(' Conexão com MongoDB estabelecida com sucesso.');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error(' Erro ao conectar ao MongoDB:', err.message);
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
