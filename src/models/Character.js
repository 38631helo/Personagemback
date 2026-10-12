const mongoose = require('mongoose');

const RARITIES = ['Comum', 'Incomum', 'Rara', 'Épica', 'Lendária', 'Mítica'];

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'O nome do personagem é obrigatório.'],
      trim: true,
      minlength: [2, 'O nome deve ter pelo menos 2 caracteres.'],
      maxlength: [100, 'O nome não pode exceder 100 caracteres.'],
    },
    game: {
      type: String,
      required: [true, 'O jogo de origem é obrigatório.'],
      trim: true,
      minlength: [2, 'O nome do jogo deve ter pelo menos 2 caracteres.'],
      maxlength: [120, 'O nome do jogo não pode exceder 120 caracteres.'],
    },
    releaseDate: {
      type: Date,
      required: [true, 'A data de lançamento é obrigatória.'],
      validate: {
        validator: function (v) {
          return !isNaN(new Date(v).getTime());
        },
        message: 'A data de lançamento deve ser uma data válida.',
      },
    },
    imageUrl: {
      type: String,
      required: [true, 'A URL ou caminho da imagem é obrigatório.'],
      trim: true,
      validate: {
        validator: function (v) {
          if (!v || typeof v !== 'string') return false;
          // Aceita URLs http/https, caminhos relativos começando com assets/ ou /, ou data URIs
          const isUrl = /^https?:\/\/.+/i.test(v);
          const isRelativePath = /^[a-zA-Z0-9_\-\/.]+\.(svg|png|jpg|jpeg|webp)$/i.test(v) || /^\/?assets\/.+/i.test(v);
          return isUrl || isRelativePath;
        },
        message: 'A imagem deve ser uma URL válida (http/https) ou um caminho relativo válido (ex: assets/placeholders/connor-detroit.svg).',
      },
    },
    rarity: {
      type: String,
      required: [true, 'A raridade da carta é obrigatória.'],
      enum: {
        values: RARITIES,
        message: `Raridade inválida. As opções válidas são: ${RARITIES.join(', ')}.`,
      },
    },
    price: {
      type: Number,
      required: [true, 'O preço da carta é obrigatório.'],
      min: [0, 'O preço deve ser igual ou superior a zero.'],
      set: (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v), // 2 casas decimais
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'A descrição não pode exceder 1000 caracteres.'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices para busca eficiente por texto e filtros
characterSchema.index({ name: 'text', game: 'text' });
characterSchema.index({ rarity: 1 });
characterSchema.index({ price: 1 });
characterSchema.index({ releaseDate: 1 });

const Character = mongoose.model('Character', characterSchema);

module.exports = Character;
module.exports.RARITIES = RARITIES;
