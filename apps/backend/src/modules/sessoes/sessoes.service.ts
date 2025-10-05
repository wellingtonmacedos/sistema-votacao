import { Injectable } from '@nestjs/common';

@Injectable()
export class SessoesService {
  findAll() {
    return [{ id: 1, tipo: 'Ordinária', status: 'Aberta' }];
  }
}
