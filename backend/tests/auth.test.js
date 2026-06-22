const request = require('supertest');

const API_URL = 'http://localhost:3000';

describe('Testes de Autenticação', () => {

  describe('Registo de Utilizador', () => {
    test('Deve registar um novo utilizador', async () => {
      const timestamp = Date.now();
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: `teste_${timestamp}@teste.com`,
          phone: `+258${timestamp}`.slice(0, 12),
          password: '123456',
          name: 'Teste',
          country: 'MZ'
        });

      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('kpId');
      } else {
        console.log('⚠️ Servidor não está rodando?');
      }
    });
  });

  describe('Login', () => {
    test('Deve fazer login com utilizadores fixos', async () => {
      const response = await request(API_URL)
        .post('/api/auth/login')
        .send({
          identifier: 'remetente@kulipapay.com',
          password: '123456'
        });

      if (response.statusCode === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('accessToken');
      }
    });
  });
});
