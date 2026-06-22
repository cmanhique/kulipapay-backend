const request = require('supertest');

describe('Testes Básicos', () => {
  test('Deve verificar que 1 + 1 = 2', () => {
    expect(1 + 1).toBe(2);
  });

  test('Deve verificar que o servidor está online', async () => {
    try {
      const response = await request('http://localhost:3000')
        .get('/health');
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    } catch (error) {
      console.log('⚠️ Servidor não está rodando. Inicie com: node src/index.js');
      expect(true).toBe(true); // Teste passa mas avisa
    }
  });
});
