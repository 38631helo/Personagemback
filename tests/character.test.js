const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Character = require('../src/models/Character');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Character.deleteMany({});
});

describe('=== API /api/health ===', () => {
  it('deve retornar status 200 com informações operacionais da API', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('database', 'connected');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('=== API /api/characters (CRUD) ===', () => {
  const sampleCharacter = {
    name: 'Connor',
    game: 'Detroit: Become Human',
    releaseDate: '2018-05-25',
    imageUrl: 'assets/placeholders/connor-detroit.svg',
    rarity: 'Lendária',
    price: 89.9,
    description: 'Androide RK800',
  };

  describe('POST /api/characters', () => {
    it('deve cadastrar um novo personagem com sucesso (201)', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send(sampleCharacter);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe('Connor');
      expect(res.body.data.price).toBe(89.9);
      expect(res.body.data.rarity).toBe('Lendária');
    });

    it('deve rejeitar cadastro sem campos obrigatórios com status 400', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send({ name: 'Incompleto' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body).toHaveProperty('details');
    });

    it('deve rejeitar raridade inválida com status 400', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send({
          ...sampleCharacter,
          rarity: 'Inexistente',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('deve rejeitar preço negativo com status 400', async () => {
      const res = await request(app)
        .post('/api/characters')
        .send({
          ...sampleCharacter,
          price: -15,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/characters', () => {
    beforeEach(async () => {
      await Character.create([
        {
          name: 'Connor',
          game: 'Detroit: Become Human',
          releaseDate: new Date('2018-05-25T00:00:00.000Z'),
          imageUrl: 'assets/placeholders/connor-detroit.svg',
          rarity: 'Lendária',
          price: 89.9,
        },
        {
          name: 'Arthur Morgan',
          game: 'Red Dead Redemption 2',
          releaseDate: new Date('2018-10-26T00:00:00.000Z'),
          imageUrl: 'assets/placeholders/arthur-morgan-rdr2.svg',
          rarity: 'Mítica',
          price: 119.9,
        },
        {
          name: 'Leon S. Kennedy',
          game: 'Resident Evil 2',
          releaseDate: new Date('1998-01-21T00:00:00.000Z'),
          imageUrl: 'assets/placeholders/leon-resident-evil.svg',
          rarity: 'Incomum',
          price: 34.9,
        },
      ]);
    });

    it('deve listar todos os personagens cadastrados', async () => {
      const res = await request(app).get('/api/characters');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('deve filtrar personagens por termo de busca no nome ou jogo', async () => {
      const res = await request(app).get('/api/characters?search=Resident');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Leon S. Kennedy');
    });

    it('deve filtrar por raridade', async () => {
      const res = await request(app).get('/api/characters?rarity=Mítica');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].name).toBe('Arthur Morgan');
    });

    it('deve ordenar por preço de forma ascendente', async () => {
      const res = await request(app).get('/api/characters?sortBy=price&order=asc');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);
      expect(res.body.data[0].price).toBe(34.9);
      expect(res.body.data[2].price).toBe(119.9);
    });
  });

  describe('GET /api/characters/:id', () => {
    it('deve buscar personagem por ID válido existente', async () => {
      const char = await Character.create(sampleCharacter);
      const res = await request(app).get(`/api/characters/${char._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Connor');
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/characters/${fakeId}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('deve retornar 400 para ID com formato inválido', async () => {
      const res = await request(app).get('/api/characters/id-invalido');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/characters/:id', () => {
    it('deve atualizar todos os campos de um personagem com sucesso', async () => {
      const char = await Character.create(sampleCharacter);

      const res = await request(app)
        .put(`/api/characters/${char._id}`)
        .send({
          name: 'Connor CyberLife',
          game: 'Detroit: Become Human',
          releaseDate: '2018-05-25',
          imageUrl: 'assets/placeholders/connor-detroit.svg',
          rarity: 'Mítica',
          price: 99.5,
          description: 'Atualizado com nova raridade',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Connor CyberLife');
      expect(res.body.data.rarity).toBe('Mítica');
      expect(res.body.data.price).toBe(99.5);
    });
  });

  describe('PATCH /api/characters/:id', () => {
    it('deve atualizar parcialmente apenas os campos informados', async () => {
      const char = await Character.create(sampleCharacter);

      const res = await request(app)
        .patch(`/api/characters/${char._id}`)
        .send({
          price: 75.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.price).toBe(75.0);
      expect(res.body.data.name).toBe('Connor'); // mantido
    });
  });

  describe('DELETE /api/characters/:id', () => {
    it('deve remover o personagem do banco de dados com sucesso', async () => {
      const char = await Character.create(sampleCharacter);

      const deleteRes = await request(app).delete(`/api/characters/${char._id}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      const checkRes = await request(app).get(`/api/characters/${char._id}`);
      expect(checkRes.status).toBe(404);
    });

    it('deve retornar 404 ao tentar remover ID inexistente', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/characters/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('=== Seed Script (Idempotência e Deduplicação) ===', () => {
    const { seedDatabase } = require('../src/seed');

    it('deve inserir os 5 personagens iniciais na primeira execução e não duplicar na segunda', async () => {
      // Primeira execução (banco limpo)
      const firstRun = await seedDatabase(false);
      expect(firstRun.createdCount).toBe(5);
      expect(firstRun.existingCount).toBe(0);

      const totalCount = await Character.countDocuments();
      expect(totalCount).toBe(5);

      // Segunda execução (deve detectar duplicatas e ignorar)
      const secondRun = await seedDatabase(false);
      expect(secondRun.createdCount).toBe(0);
      expect(secondRun.existingCount).toBe(5);

      // Total deve permanecer exatamente 5
      const totalCountAfter = await Character.countDocuments();
      expect(totalCountAfter).toBe(5);
    });
  });
});
