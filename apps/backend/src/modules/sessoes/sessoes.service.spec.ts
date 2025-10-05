import { SessoesService } from './sessoes.service';

describe('SessoesService', () => {
  let service: SessoesService;

  beforeEach(() => {
    service = new SessoesService();
  });

  it('deve retornar lista de sessões', () => {
    expect(service.findAll()).toEqual([{ id: 1, tipo: 'Ordinária', status: 'Aberta' }]);
  });
});
