import { Controller, Post, Get, Param, Body, Patch } from '@nestjs/common';
import { ProcessoLegislativoService } from './processo-legislativo.service';

@Controller('processos')
export class ProcessoLegislativoController {
  constructor(private readonly service: ProcessoLegislativoService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.service.publish(id);
  }

  @Patch(':id/start-reading')
  startReading(@Param('id') id: string) {
    return this.service.startReading(id);
  }

  @Patch(':id/stop-reading')
  stopReading(@Param('id') id: string) {
    return this.service.stopReading(id);
  }

  @Patch(':id/send-to-ordem')
  sendToOrdem(@Param('id') id: string, @Body() body: any) {
    return this.service.sendToOrdem(id, body);
  }

  @Patch(':id/remove-from-ordem')
  removeFromOrdem(@Param('id') id: string) {
    return this.service.removeFromOrdem(id);
  }
}
