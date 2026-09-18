import 'reflect-metadata';
import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto.js';
import { UpdateLinksDto } from './update-links.dto.js';
import { UpdateSkillsDto } from './update-skills.dto.js';

describe('user DTO validation', () => {
  it('rejects invalid social links at the API boundary', async () => {
    const dto = new UpdateLinksDto();
    dto.links = {
      portfolio: 'not-a-url',
      github: 'https://github.com/example',
      linkedin: 'https://linkedin.com/in/example',
      facebook: 'https://facebook.com/example',
    };

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-string skill entries', async () => {
    const dto = new UpdateSkillsDto();
    dto.skills = ['frontend', 42 as unknown as string];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('requires password confirmation to match', async () => {
    const dto = new ChangePasswordDto();
    dto.currentPassword = 'CurrentPass1';
    dto.newPassword = 'NewPass2';
    dto.confirmNewPassword = 'DifferentPass2';

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'confirmNewPassword')).toBe(true);
  });
});
