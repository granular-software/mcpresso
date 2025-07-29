import { Template } from './types.js';
import { vercelTemplate } from './vercel/index.js';
import { cloudflareTemplate } from './cloudflare/index.js';
import { awsLambdaTemplate } from './aws-lambda/index.js';
import { dockerTemplate } from './docker/index.js';
import { expressTemplate } from './express/index.js';

// Import all templates
const templates: Template[] = [
  vercelTemplate,
  cloudflareTemplate,
  awsLambdaTemplate,
  dockerTemplate,
  expressTemplate,
];

export function getTemplates(): Template[] {
  return templates;
}

export function getTemplate(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: 'cloud' | 'self-hosted'): Template[] {
  return templates.filter(t => t.category === category);
}

export function getTemplatesByComplexity(complexity: 'easy' | 'medium' | 'hard'): Template[] {
  return templates.filter(t => t.complexity === complexity);
} 