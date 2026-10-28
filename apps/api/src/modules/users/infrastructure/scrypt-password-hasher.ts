import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../application/ports/password-hasher.js';

const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await derive(plain, salt, { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION });
    return [
      'scrypt',
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString('base64'),
      key.toString('base64'),
    ].join('$');
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [scheme, cost, blockSize, parallelization, salt, key] = hash.split('$');
    if (scheme !== 'scrypt' || !salt || !key) return false;
    const expected = Buffer.from(key, 'base64');
    const actual = await derive(plain, Buffer.from(salt, 'base64'), {
      N: Number(cost),
      r: Number(blockSize),
      p: Number(parallelization),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
