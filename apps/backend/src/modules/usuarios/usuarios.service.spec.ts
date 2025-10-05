import { UsuariosService } from './usuarios.service';

describe('UsuariosService', () => {
  let service: UsuariosService;

  beforeEach(() => {
    service = new UsuariosService();
  });

  it('deve retornar lista de usuários', () => {
    expect(service.findAll()).toEqual([{ id: 1, nome: 'Vereador Exemplo' }]);
  });
});
