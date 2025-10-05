import { Injectable } from '@nestjs/common';

@Injectable()
export class PautasService {
  findAll() {
    return [{ id: 1, titulo: 'Projeto de Lei X', descricao: 'Descrição da pauta.' }];
  }
}
