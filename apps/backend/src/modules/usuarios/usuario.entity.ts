export class Usuario {
  id: number;
  nome: string;
  perfil: string;
  partido?: string;
  mandato_inicio?: Date;
  mandato_fim?: Date;
  ativo: boolean;
  credenciais?: string;
  mfa?: boolean;
  chave_publica?: string;
}
