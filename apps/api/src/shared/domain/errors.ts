export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';

  constructor(entity: string, id?: number | string) {
    super(id === undefined ? `${entity} not found` : `${entity} ${id} not found`);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

export class BusinessRuleError extends DomainError {
  constructor(
    readonly code: string,
    message: string,
    details?: unknown,
  ) {
    super(message, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
}
