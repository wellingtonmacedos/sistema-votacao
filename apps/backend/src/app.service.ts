import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Sistema de Votação Eletrônica Backend rodando!';
  }
}
