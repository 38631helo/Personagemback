const mongoose = require('mongoose');
const Character = require('../models/Character');

/**
 * Função utilitária para normalizar data de lançamento
 * Se fornecida apenas no formato YYYY-MM-DD ou YYYY, garante que seja interpretada em UTC
 * para evitar discrepâncias de fuso horário.
 */
function parseReleaseDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  const str = String(dateInput).trim();
  // Se for apenas o ano (ex: "2018")
  if (/^\d{4}$/.test(str)) {
    return new Date(`${str}-01-01T00:00:00.000Z`);
  }
  // Se for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T00:00:00.000Z`);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Valida se um ID é um ObjectId válido do MongoDB
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/characters
 * Lista personagens com suporte a busca, filtros e ordenação
 */
exports.getAllCharacters = async (req, res, next) => {
  try {
    const {
      search,
      name,
      game,
      rarity,
      sortBy = 'createdAt',
      order = 'desc',
      page,
      limit,
    } = req.query;

    const filter = {};

    // Busca textual ampla em name e game
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      filter.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { game: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    // Filtro específico por nome
    if (name && name.trim() !== '') {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }

    // Filtro específico por jogo
    if (game && game.trim() !== '') {
      filter.game = { $regex: game.trim(), $options: 'i' };
    }

    // Filtro por raridade
    if (rarity && rarity.trim() !== '' && rarity !== 'Todas') {
      filter.rarity = rarity.trim();
    }

    // Ordenação permitida
    const allowedSortFields = ['price', 'releaseDate', 'name', 'game', 'createdAt', 'rarity'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = order.toLowerCase() === 'asc' || order === '1' ? 1 : -1;
    const sort = { [sortField]: sortDirection };

    // Paginação opcional
    const query = Character.find(filter).sort(sort);

    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const skip = (pageNum - 1) * limitNum;

      const [characters, total] = await Promise.all([
        query.skip(skip).limit(limitNum).exec(),
        Character.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        count: characters.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: characters,
      });
    }

    const characters = await query.exec();
    const total = characters.length;

    return res.status(200).json({
      success: true,
      count: total,
      total,
      data: characters,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/characters/:id
 * Retorna os detalhes de um personagem específico por ID
 */
exports.getCharacterById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `O ID fornecido '${id}' não é um identificador válido do MongoDB.`,
      });
    }

    const character = await Character.findById(id);

    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'Personagem não encontrado.',
      });
    }

    return res.status(200).json({
      success: true,
      data: character,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/characters
 * Cadastra um novo personagem
 */
exports.createCharacter = async (req, res, next) => {
  try {
    const { name, game, releaseDate, imageUrl, rarity, price, description } = req.body;

    const normalizedDate = releaseDate ? parseReleaseDate(releaseDate) : undefined;
    const parsedPrice = typeof price === 'string' && price.trim() !== ''
      ? parseFloat(price.replace(',', '.'))
      : price;

    const newCharacter = new Character({
      name,
      game,
      releaseDate: normalizedDate !== null ? normalizedDate : 'invalid-date',
      imageUrl,
      rarity,
      price: parsedPrice,
      description: description || '',
    });

    const savedCharacter = await newCharacter.save();

    return res.status(201).json({
      success: true,
      message: 'Personagem cadastrado com sucesso!',
      data: savedCharacter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/characters/:id
 * Atualiza todos os campos editáveis de um personagem
 */
exports.updateCharacter = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `O ID fornecido '${id}' não é um identificador válido do MongoDB.`,
      });
    }

    const { name, game, releaseDate, imageUrl, rarity, price, description } = req.body;

    const normalizedDate = releaseDate ? parseReleaseDate(releaseDate) : undefined;
    const parsedPrice = typeof price === 'string' && price.trim() !== ''
      ? parseFloat(price.replace(',', '.'))
      : price;

    const updated = await Character.findByIdAndUpdate(
      id,
      {
        name,
        game,
        releaseDate: normalizedDate !== null ? normalizedDate : 'invalid-date',
        imageUrl,
        rarity,
        price: parsedPrice,
        description: description !== undefined ? description : '',
      },
      {
        new: true,
        runValidators: true,
        overwrite: false,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Personagem não encontrado para atualização.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Personagem atualizado com sucesso!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/characters/:id
 * Atualiza parcialmente um personagem
 */
exports.patchCharacter = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `O ID fornecido '${id}' não é um identificador válido do MongoDB.`,
      });
    }

    const updates = { ...req.body };

    // Se releaseDate foi fornecida, normaliza
    if (updates.releaseDate !== undefined) {
      const normalizedDate = parseReleaseDate(updates.releaseDate);
      if (!normalizedDate) {
        return res.status(400).json({
          success: false,
          error: 'Data de lançamento inválida. Informe uma data no formato AAAA-MM-DD ou AAAA.',
        });
      }
      updates.releaseDate = normalizedDate;
    }

    // Se price foi fornecido, formata
    if (updates.price !== undefined) {
      updates.price = typeof updates.price === 'string'
        ? parseFloat(updates.price.replace(',', '.'))
        : updates.price;
    }

    // Evita alterar IDs ou timestamps manualmente
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const updated = await Character.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Personagem não encontrado para atualização parcial.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Personagem atualizado com sucesso!',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/characters/:id
 * Exclui um personagem por ID
 */
exports.deleteCharacter = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `O ID fornecido '${id}' não é um identificador válido do MongoDB.`,
      });
    }

    const deleted = await Character.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Personagem não encontrado para exclusão.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Personagem '${deleted.name}' excluído com sucesso!`,
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};
