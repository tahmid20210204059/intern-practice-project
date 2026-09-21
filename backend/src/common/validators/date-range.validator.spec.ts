import { validateSync } from 'class-validator';
import { ExperienceItemDto } from '../../users/dto/experience-item.dto.js';
import { isMonthInPastOrCurrent } from './date-range.validator.js';

describe('date-range validator', () => {
  it('rejects future months relative to the current date', () => {
    const futureMonth = '2099-01';
    expect(isMonthInPastOrCurrent(futureMonth)).toBe(false);
  });

  it('accepts the current month and earlier months', () => {
    const current = new Date();
    const currentMonth = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const pastMonth = '2020-01';

    expect(isMonthInPastOrCurrent(currentMonth)).toBe(true);
    expect(isMonthInPastOrCurrent(pastMonth)).toBe(true);
  });

  it('allows a future end date when it is still after the start date', () => {
    const dto = Object.assign(new ExperienceItemDto(), {
      title: 'Engineer',
      company: 'Acme',
      from: '2026-01',
      to: '2027-01',
      description: 'ok',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('allows an empty end date for a current experience', () => {
    const dto = Object.assign(new ExperienceItemDto(), {
      title: 'Engineer',
      company: 'Acme',
      from: '2026-01',
      to: '',
      description: 'ok',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects an end date earlier than the start date', () => {
    const dto = Object.assign(new ExperienceItemDto(), {
      title: 'Engineer',
      company: 'Acme',
      from: '2026-06',
      to: '2026-05',
      description: 'ok',
    });

    const errors = validateSync(dto);
    expect(errors.some((error) => error.property === 'to' && error.constraints?.isAfterOrEqualMonth)).toBe(true);
  });
});
