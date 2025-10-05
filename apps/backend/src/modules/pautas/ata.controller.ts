import { Controller, Post, Get, Param, Body, Patch } from '@nestjs/common';
import { AtaService } from './ata.service';

@Controller('atas')
export class AtaController {
  constructor(private readonly ataService: AtaService) {}

  @Post()
  create(@Body() dto: any) {
    return this.ataService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ataService.findOne(id);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.ataService.publish(id);
  }

  @Patch(':id/start-reading')
  startReading(@Param('id') id: string) {
    return this.ataService.startReading(id);
  }

  @Patch(':id/stop-reading')
  stopReading(@Param('id') id: string) {
    return this.ataService.stopReading(id);
  }

  @Patch(':id/start-voting')
  startVoting(@Param('id') id: string) {
    return this.ataService.startVoting(id);
  }

  @Patch(':id/end-voting')
  endVoting(@Param('id') id: string) {
    return this.ataService.endVoting(id);
  }

  @Get(':id/results')
  getResults(@Param('id') id: string) {
    return this.ataService.getResults(id);
  }
}
