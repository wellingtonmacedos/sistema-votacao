import { Controller, Get } from '@nestjs/common';
import { SessoesService } from './sessoes.service';

@Controller('sessoes')
export class SessoesController {
  constructor(private readonly sessoesService: SessoesService) {}

  @Get()
  findAll() {
    return this.sessoesService.findAll();
  }
}
