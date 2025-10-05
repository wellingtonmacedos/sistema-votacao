import { PautasService } from './pautas.service';

describe('PautasService', () => {
  let service: PautasService;

  beforeEach(() => {
    service = new PautasService();
  });

  it('deve retornar lista de pautas', () => {
    expect(service.findAll()).toEqual([{ id: 1, titulo: 'Projeto de Lei X', descricao: 'Descrição da pauta.' }]);
  });
});
