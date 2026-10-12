require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Character = require('./models/Character');

const INITIAL_CHARACTERS = [
  {
    name: 'Connor',
    game: 'Detroit: Become Human',
    releaseDate: new Date('2018-05-25T00:00:00.000Z'),
    imageUrl: 'assets/placeholders/connor-detroit.svg',
    rarity: 'Lendária',
    price: 89.9,
    description: 'Androide modelo RK800 projetado pela CyberLife para auxiliar a polícia de Detroit na investigação de casos envolvendo divergentes.',
  },
  {
    name: 'Arthur Morgan',
    game: 'Red Dead Redemption 2',
    releaseDate: new Date('2018-10-26T00:00:00.000Z'),
    imageUrl: 'assets/placeholders/arthur-morgan-rdr2.svg',
    rarity: 'Mítica',
    price: 119.9,
    description: 'Fora da lei experiente e braço direito da gangue Van der Linde durante o declínio da era dos pistoleiros no Velho Oeste.',
  },
  {
    name: 'Doom Slayer',
    game: 'DOOM (2016)',
    releaseDate: new Date('2016-05-13T00:00:00.000Z'),
    imageUrl: 'assets/placeholders/doom-slayer-doom.svg',
    rarity: 'Épica',
    price: 69.9,
    description: 'Guerreiro implacável dotado de força sobre-humana e temido pelas hordas do Inferno, trajando a armadura Praetor.',
  },
  {
    name: 'Bayonetta',
    game: 'Bayonetta',
    releaseDate: new Date('2009-10-29T00:00:00.000Z'),
    imageUrl: 'assets/placeholders/bayonetta.svg',
    rarity: 'Rara',
    price: 49.9,
    description: 'Poderosa Bruxa de Umbra com habilidades acrobáticas impecáveis, domínio do Witch Time e armas de fogo acopladas aos saltos.',
  },
  {
    name: 'Leon S. Kennedy',
    game: 'Resident Evil 2',
    releaseDate: new Date('1998-01-21T00:00:00.000Z'),
    imageUrl: 'assets/placeholders/leon-resident-evil.svg',
    rarity: 'Incomum',
    price: 34.9,
    description: 'Policial novato do R.P.D. que enfrentou o pesadelo biológico do T-Virus em seu primeiro e fatídico dia de trabalho em Raccoon City.',
  },
];

async function seedDatabase(shouldCloseConnection = true) {
  console.log(' Iniciando processo de seed manual...');

  try {
    await connectDB();

    let createdCount = 0;
    let existingCount = 0;

    for (const charData of INITIAL_CHARACTERS) {
      // Busca registro idêntico para evitar duplicação em execuções sucessivas
      const existing = await Character.findOne({
        name: charData.name,
        game: charData.game,
      });

      if (existing) {
        console.log(`ℹ️ [IGNORADO] Personagem já existe: "${charData.name}" (${charData.game})`);
        existingCount++;
      } else {
        await Character.create(charData);
        console.log(`✅ [CRIADO] Personagem cadastrado com sucesso: "${charData.name}" (${charData.game})`);
        createdCount++;
      }
    }

    console.log('\n Resumo da execução do seed:');
    console.log(`  - Novos personagens inseridos: ${createdCount}`);
    console.log(`  - Personagens já existentes (mantidos): ${existingCount}`);
    console.log(`  - Total no catálogo inicial: ${INITIAL_CHARACTERS.length}`);
    console.log('\n Seed concluído com sucesso!');

    return { createdCount, existingCount, total: INITIAL_CHARACTERS.length };
  } catch (error) {
    console.error(' Falha ao executar o seed:', error);
    process.exitCode = 1;
    throw error;
  } finally {
    if (shouldCloseConnection) {
      await mongoose.connection.close();
      console.log(' Conexão com MongoDB encerrada.');
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, INITIAL_CHARACTERS };
