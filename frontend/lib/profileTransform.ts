import { PortfolioFormValues, PortfolioProjectFormValues } from './schemas';

export interface PortfolioProjectApi {
  title: string;
  description: string;
  urls: { live: string; github: string };
  technologies: string[];
  from: string;
  to: string;
  isCurrent: boolean;
}

export interface ProfileApiData {
  _id: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  portfolioProjects?: PortfolioProjectApi[];
}

export function emptyProject(): PortfolioProjectFormValues {
  return {
    title: '',
    description: '',
    urls: { live: '', github: '' },
    technologies: [],
    from: '',
    isCurrent: false,
    to: '',
  };
}

export function mapApiToPortfolioForm(data: ProfileApiData): PortfolioFormValues {
  return {
    portfolioProjects: (data.portfolioProjects || []).map((project) => ({
      title: project.title,
      description: project.description || '',
      urls: {
        live: project.urls?.live || '',
        github: project.urls?.github || '',
      },
      technologies: (project.technologies || []).map((value) => ({ value })),
      from: project.from,
      to: project.to || '',
      isCurrent: !!project.isCurrent,
    })),
  };
}

export function mapPortfolioFormToApi(values: PortfolioFormValues) {
  return {
    portfolioProjects: values.portfolioProjects.map((project) => ({
      title: project.title.trim(),
      description: project.description?.trim() || '',
      urls: {
        live: project.urls.live.trim(),
        github: project.urls.github.trim(),
      },
      technologies: project.technologies.map((t) => t.value.trim()).filter(Boolean),
      from: project.from,
      to: project.isCurrent ? '' : project.to,
      isCurrent: project.isCurrent,
    })),
  };
}