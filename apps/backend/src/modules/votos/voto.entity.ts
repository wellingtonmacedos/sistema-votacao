export class Voto {
  id: number;
  pauta_id: number;
  vereador_id: number;
  escolha: 'Sim' | 'Não' | 'Abstenção';
  justificativa?: string;
  timestamp: Date;
  assinatura_hash?: string;
}
