export class CreateUsuarioDto {
  nome: string;
  perfil: string;
  partido?: string;
  mandato_inicio?: Date;
  mandato_fim?: Date;
  ativo: boolean;
}
