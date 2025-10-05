export class EventoAuditoria {
  id: number;
  tipo: string;
  payload_json: string;
  hash_anterior?: string;
  hash_atual: string;
  timestamp: Date;
}
