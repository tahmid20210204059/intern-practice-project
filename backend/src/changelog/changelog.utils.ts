import { BadRequestException } from '@nestjs/common';

const OWNER_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const REPO_REGEX = /^[\w.-]{1,100}$/;
const FORMAT_MESSAGE = 'Repository must be in "owner/repo" format, for example "acme/widgets".';

export interface RepoRef {
  owner: string;
  repo: string;
}

export function parseRepo(input: unknown): RepoRef {
  if (typeof input !== 'string' || !input.trim()) throw new BadRequestException(FORMAT_MESSAGE);
  const parts = input.trim().split('/');
  if (parts.length !== 2) throw new BadRequestException(FORMAT_MESSAGE);
  const [owner, repo] = parts;
  if (!OWNER_REGEX.test(owner) || !REPO_REGEX.test(repo) || repo === '.' || repo === '..') {
    throw new BadRequestException(FORMAT_MESSAGE);
  }
  return { owner: owner.toLowerCase(), repo: repo.toLowerCase() };
}

export function normalizePrivateKey(raw: string | undefined): string {
  const value = (raw ?? '').trim().replace(/\\n/g, '\n');
  if (!value) return '';
  if (value.includes('-----BEGIN')) return value;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return decoded.includes('-----BEGIN') ? decoded : value;
  } catch {
    return value;
  }
}
