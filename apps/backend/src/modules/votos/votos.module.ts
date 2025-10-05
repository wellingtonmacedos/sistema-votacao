import { Module } from '@nestjs/common';
import { VotosController } from './votos.controller';
import { VotosService } from './votos.service';

@Module({
  controllers: [VotosController],
  providers: [VotosService],
})
export class VotosModule {}
