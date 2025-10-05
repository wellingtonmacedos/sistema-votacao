import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  it('deve retornar mensagem de backend rodando', () => {
    expect(service.getHello()).toBe('Sistema de Votação Eletrônica Backend rodando!');
  });
});
