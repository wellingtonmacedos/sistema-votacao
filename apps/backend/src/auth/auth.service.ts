import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(user: any, password: string): Promise<any> {
    if (user && await bcrypt.compare(password, user.credenciais)) {
      const { credenciais, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.nome, sub: user.id, perfil: user.perfil };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
