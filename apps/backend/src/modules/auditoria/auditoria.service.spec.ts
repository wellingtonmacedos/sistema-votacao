import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;

  beforeEach(() => {
    service = new AuditoriaService();
  });

  it('deve retornar lista de eventos de auditoria', () => {
    expect(service.findAll()).toEqual([{ id: 1, tipo: 'Voto', hash: 'abc123' }]);
  });
});
