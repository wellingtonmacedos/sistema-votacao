import { Controller, Get } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  findAll() {
    return this.auditoriaService.findAll();
  }
}
