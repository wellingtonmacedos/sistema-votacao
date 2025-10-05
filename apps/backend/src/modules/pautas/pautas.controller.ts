import { Controller, Get } from '@nestjs/common';
import { PautasService } from './pautas.service';

@Controller('pautas')
export class PautasController {
  constructor(private readonly pautasService: PautasService) {}

  @Get()
  findAll() {
    return this.pautasService.findAll();
  }
}
