const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');

// Rotas da coleção de personagens
router.get('/', characterController.getAllCharacters);
router.post('/', characterController.createCharacter);

// Rotas de recurso específico por ID
router.get('/:id', characterController.getCharacterById);
router.put('/:id', characterController.updateCharacter);
router.patch('/:id', characterController.patchCharacter);
router.delete('/:id', characterController.deleteCharacter);

module.exports = router;
