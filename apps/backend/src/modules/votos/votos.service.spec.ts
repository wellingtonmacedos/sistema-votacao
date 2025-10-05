import { VotosService } from './votos.service';

describe('VotosService', () => {
  let service: VotosService;

  beforeEach(() => {
    service = new VotosService();
  });

  it('deve retornar lista de votos', () => {
    expect(service.findAll()).toEqual([{ id: 1, pauta_id: 1, vereador_id: 1, escolha: 'Sim' }]);
  });
});
