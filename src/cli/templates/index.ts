import { Template } from './types.js';

// Note: Templates are now external and managed via template-manager.ts
// This file is kept for type definitions but no longer contains built-in templates

const templates: Template[] = [];

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