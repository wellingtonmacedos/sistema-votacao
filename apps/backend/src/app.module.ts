import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { SessoesModule } from './modules/sessoes/sessoes.module';
import { PautasModule } from './modules/pautas/pautas.module';
import { VotosModule } from './modules/votos/votos.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { Usuario } from './modules/usuarios/usuario.entity';
import { Sessao } from './modules/sessoes/sessao.entity';
import { Pauta } from './modules/pautas/pauta.entity';
import { Voto } from './modules/votos/voto.entity';
import { EventoAuditoria } from './modules/auditoria/evento-auditoria.entity';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'sistemavotacao',
      entities: [Usuario, Sessao, Pauta, Voto, EventoAuditoria],
      synchronize: true,
    }),
  AuthModule,
  UsuariosModule,
  SessoesModule,
  PautasModule,
  VotosModule,
  AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
