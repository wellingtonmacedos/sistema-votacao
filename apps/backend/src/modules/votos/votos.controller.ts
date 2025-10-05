import { Controller, Get } from '@nestjs/common';
import { VotosService } from './votos.service';

@Controller('votos')
export class VotosController {
  constructor(private readonly votosService: VotosService) {}

  @Get()
  findAll() {
    return this.votosService.findAll();
  }
}
