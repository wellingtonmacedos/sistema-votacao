import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditoriaService {
  findAll() {
    return [{ id: 1, tipo: 'Voto', hash: 'abc123' }];
  }
}
