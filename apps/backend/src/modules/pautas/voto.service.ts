import { Injectable } from '@nestjs/common';
import { Voto } from './voto.entity';
import { Ata } from './ata.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class VotoService {
  constructor(
    @InjectRepository(Voto)
    private readonly votoRepo: Repository<Voto>,
    @InjectRepository(Ata)
    private readonly ataRepo: Repository<Ata>
  ) {}

  async votar(ataId: string, dto: any, user?: any) {
    // Validar perfil
    if (!user || user.perfil !== 'vereador') throw new Error('Apenas vereadores podem votar');
    // Validar estado da ata
  const ata = await this.ataRepo.findOne({ where: { id: ataId } });
  if (!ata || ata.status !== 'VOTING') throw new Error('Votação não está aberta');
    // Impedir duplicidade
    const votoExistente = await this.votoRepo.findOne({ where: { ata_id: ataId, vereador_id: user.id } });
    if (votoExistente) throw new Error('Voto já registrado para este vereador');
    // Registrar voto
    const voto = this.votoRepo.create({ ...dto, ata_id: ataId, vereador_id: user.id });
    return this.votoRepo.save(voto);
  }
}
