import { describe, expect, it } from 'vitest';
import { emptyProject, mapApiToPortfolioForm, mapPortfolioFormToApi } from './profileTransform';

describe('profile transforms', () => {
  it('creates an empty project', () => {
    expect(emptyProject()).toEqual({
      title: '', description: '', urls: { live: '', github: '' }, technologies: [], from: '', isCurrent: false, to: '',
    });
  });

  it('maps API projects into form values with tool objects and safe defaults', () => {
    const form = mapApiToPortfolioForm({
      _id: '1',
      portfolioProjects: [{ title: 'A', description: '', urls: { live: '', github: '' }, technologies: ['react', 'nest'], from: '2020-01', to: '', isCurrent: true }],
    });
    expect(form.portfolioProjects[0].technologies).toEqual([{ value: 'react' }, { value: 'nest' }]);
    expect(form.portfolioProjects[0].isCurrent).toBe(true);
  });

  it('handles a profile without projects', () => {
    expect(mapApiToPortfolioForm({ _id: '1' })).toEqual({ portfolioProjects: [] });
  });

  it('maps form values to the API payload, trimming and clearing the end date for ongoing projects', () => {
    const payload = mapPortfolioFormToApi({
      portfolioProjects: [
        {
          title: '  A  ', description: '  d  ', urls: { live: ' https://x.io ', github: ' ' },
          technologies: [{ value: ' react ' }, { value: ' ' }], from: '2020-01', to: '2021-01', isCurrent: true,
        },
      ],
    });
    expect(payload.portfolioProjects[0]).toEqual({
      title: 'A', description: 'd', urls: { live: 'https://x.io', github: '' }, technologies: ['react'], from: '2020-01', to: '', isCurrent: true,
    });
  });

  it('keeps the end date for completed projects', () => {
    const payload = mapPortfolioFormToApi({
      portfolioProjects: [{ title: 'A', description: '', urls: { live: '', github: '' }, technologies: [], from: '2020-01', to: '2021-01', isCurrent: false }],
    });
    expect(payload.portfolioProjects[0].to).toBe('2021-01');
  });
});
