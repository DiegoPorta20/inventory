import { Module } from '@nestjs/common';
import { PasswordHasher } from './application/ports/password-hasher.js';
import { UserRepository } from './application/ports/user.repository.js';
import { CreateUser } from './application/use-cases/create-user.js';
import { ListUsers } from './application/use-cases/list-users.js';
import { UpdateUser } from './application/use-cases/update-user.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user.repository.js';
import { ScryptPasswordHasher } from './infrastructure/scrypt-password-hasher.js';
import { UsersController } from './presentation/users.controller.js';

@Module({
  controllers: [UsersController],
  providers: [
    ListUsers,
    CreateUser,
    UpdateUser,
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: PasswordHasher, useClass: ScryptPasswordHasher },
  ],
  exports: [UserRepository, PasswordHasher, CreateUser],
})
export class UsersModule {}
