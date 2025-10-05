import { Injectable } from '@nestjs/common';

@Injectable()
export class VotosService {
  findAll() {
    return [{ id: 1, pauta_id: 1, vereador_id: 1, escolha: 'Sim' }];
  }
}
