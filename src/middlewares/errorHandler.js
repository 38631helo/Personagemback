/**
 * Middleware centralizado de tratamento de erros.
 * Garante respostas JSON padronizadas e códigos HTTP semânticos.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error Handler]:', err);
  }

  // Erro de validação do Mongoose
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    return res.status(400).json({
      success: false,
      error: 'Erro de validação dos dados enviados.',
      details,
    });
  }

  // Erro de Cast do Mongoose (ex: ObjectId inválido)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Formato inválido para o campo '${err.path}': '${err.value}'.`,
    });
  }

  // Chave duplicada no MongoDB (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({
      success: false,
      error: `Já existe um registro com o valor informado para '${field}'.`,
    });
  }

  // JSON malformado no body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'JSON malformado no corpo da requisição.',
    });
  }

  // Status code customizado ou fallback para 500
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'Erro interno do servidor.';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
