import { Injectable } from '@nestjs/common';

@Injectable()
export class UsuariosService {
  findAll() {
    return [{ id: 1, nome: 'Vereador Exemplo' }];
  }
}
