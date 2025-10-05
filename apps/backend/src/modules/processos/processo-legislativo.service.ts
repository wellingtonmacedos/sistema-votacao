import { Injectable } from '@nestjs/common';
import { ProcessoLegislativo } from './processo-legislativo.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ProcessoLegislativoService {
  constructor(
    @InjectRepository(ProcessoLegislativo)
    private readonly repo: Repository<ProcessoLegislativo>
  ) {}

  async create(dto: any) {
    const processo = this.repo.create(dto);
    return this.repo.save(processo);
  }

  async findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async publish(id: string, user?: any) {
    const processo = await this.repo.findOne({ where: { id } });
    if (!processo || processo.status !== 'DRAFT') throw new Error('Não pode publicar');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    await this.repo.update(id, { status: 'PUBLISHED' });
    await this.addAuditLog(id, user, 'publish');
    return { success: true };
  }

  async startReading(id: string, user?: any) {
    const processo = await this.repo.findOne({ where: { id } });
    if (!processo || (processo.status !== 'PUBLISHED' && processo.status !== 'READING_PAUSED')) throw new Error('Não pode iniciar leitura');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    await this.repo.update(id, { status: 'READING', leitura_started_at: new Date() });
    await this.addAuditLog(id, user, 'startReading');
    return { success: true };
  }

  async stopReading(id: string, user?: any) {
    const processo = await this.repo.findOne({ where: { id } });
    if (!processo || processo.status !== 'READING') throw new Error('Não está em leitura');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    await this.repo.update(id, { status: 'READING_PAUSED', leitura_stopped_at: new Date() });
    await this.addAuditLog(id, user, 'stopReading');
    return { success: true };
  }

  async sendToOrdem(id: string, body: any, user?: any) {
    const processo = await this.repo.findOne({ where: { id } });
    if (!processo || !['PUBLISHED','READING','READING_PAUSED'].includes(processo.status)) throw new Error('Não pode enviar para Ordem do Dia');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    await this.repo.update(id, { status: 'SENT_TO_ORDEN_DO_DIA', sent_to_ordem_at: new Date(), prioridade: body?.prioridade });
    await this.addAuditLog(id, user, 'sendToOrdem', { prioridade: body?.prioridade });
    return { success: true };
  }

  async removeFromOrdem(id: string, user?: any) {
    const processo = await this.repo.findOne({ where: { id } });
    if (!processo || processo.status !== 'SENT_TO_ORDEN_DO_DIA') throw new Error('Não está na Ordem do Dia');
    if (!user || user.perfil !== 'admin') throw new Error('Permissão negada');
    await this.repo.update(id, { status: 'REMOVED_FROM_ORDEN_DO_DIA' });
    await this.addAuditLog(id, user, 'removeFromOrdem');
    return { success: true };
  }
  async addAuditLog(id: string, user: any, action: string, meta?: any) {
    await this.repo.manager.query(
      `UPDATE processos_legislativos SET audit_log = COALESCE(audit_log, '[]'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify({ user_id: user.id, action, timestamp: new Date(), meta }), id]
    );
  }
}
