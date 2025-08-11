import { ProjectConfig } from '../utils/project-creator.js';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'cloud' | 'self-hosted';
  features: string[];
  complexity: 'easy' | 'medium' | 'hard';
  generateFiles: (config: ProjectConfig) => Promise<Record<string, string>>;
  getDependencies: () => Record<string, string>;
  getDevDependencies: () => Record<string, string>;
  getScripts: () => Record<string, string>;
}

export interface TemplateFile {
  path: string;
  content: string;
  isExecutable?: boolean;
}

export interface TemplateConfig {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  files: TemplateFile[];
} 