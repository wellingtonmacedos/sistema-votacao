import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    // Aqui você buscaria o usuário no banco (mock para exemplo)
    const user = { id: 1, nome: body.username, perfil: 'vereador', credenciais: '$2a$10$...' };
    const valid = await this.authService.validateUser(user, body.password);
    if (!valid) {
      return { error: 'Credenciais inválidas' };
    }
    return this.authService.login(user);
  }
}
