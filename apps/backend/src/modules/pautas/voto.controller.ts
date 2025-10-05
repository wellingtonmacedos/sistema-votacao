import { Controller, Post, Param, Body } from '@nestjs/common';
import { VotoService } from './voto.service';

@Controller('atas/:id/votes')
export class VotoController {
  constructor(private readonly votoService: VotoService) {}

  @Post()
  votar(@Param('id') ataId: string, @Body() dto: any) {
    return this.votoService.votar(ataId, dto);
  }
}
