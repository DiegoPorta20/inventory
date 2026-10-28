import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { Role, type AuthenticatedUser } from '../../../shared/domain/auth.js';
import { CurrentUser, Roles } from '../../../shared/presentation/decorators.js';
import { ZodValidationPipe } from '../../../shared/presentation/zod-validation.pipe.js';
import { CreateUser } from '../application/use-cases/create-user.js';
import { ListUsers } from '../application/use-cases/list-users.js';
import { UpdateUser } from '../application/use-cases/update-user.js';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserBody,
  type UpdateUserBody,
} from './users.schemas.js';

@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly listUsers: ListUsers,
    private readonly createUser: CreateUser,
    private readonly updateUser: UpdateUser,
  ) {}

  @Get()
  list() {
    return this.listUsers.execute();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserBody) {
    return this.createUser.execute(body);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserBody,
  ) {
    return this.updateUser.execute(actor.id, id, body);
  }
}
