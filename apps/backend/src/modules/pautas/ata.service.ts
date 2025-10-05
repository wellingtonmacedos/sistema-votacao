import { Injectable } from '@nestjs/common';
import { Ata } from './ata.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AtaService {
  constructor(
    @InjectRepository(Ata)
    private readonly ataRepo: Repository<Ata>
  ) {}

  async create(dto: any) {
    const ata = this.ataRepo.create(dto);
    return this.ataRepo.save(ata);
  }

  async findOne(id: string) {
    return this.ataRepo.findOne({ where: { id } });
  }

  async publish(id: string, user?: any) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    if (!ata || ata.status !== 'DRAFT') throw new Error('Ata não pode ser publicada');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    return this.ataRepo.update(id, { status: 'PUBLISHED' });
  }

  async startReading(id: string, user?: any) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    if (!ata || !['PUBLISHED', 'READING_PAUSED'].includes(ata.status)) throw new Error('Ata não pode iniciar leitura');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    return this.ataRepo.update(id, { status: 'READING', reading_started_at: new Date() });
  }

  async stopReading(id: string, user?: any) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    if (!ata || ata.status !== 'READING') throw new Error('Ata não está em leitura');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    return this.ataRepo.update(id, { status: 'READING_PAUSED', reading_stopped_at: new Date() });
  }

  async startVoting(id: string, user?: any) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    if (!ata || !['PUBLISHED', 'READING', 'READING_PAUSED'].includes(ata.status)) throw new Error('Ata não pode iniciar votação');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    return this.ataRepo.update(id, { status: 'VOTING', voting_started_at: new Date() });
  }

  async endVoting(id: string, user?: any) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    if (!ata || ata.status !== 'VOTING') throw new Error('Ata não está em votação');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    return this.ataRepo.update(id, { status: 'VOTING_CLOSED', voting_ended_at: new Date() });
  }

  async getResults(id: string) {
    const ata = await this.ataRepo.findOne({ where: { id } });
    return ata?.resultado;
  }
}
