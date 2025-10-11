'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TemplateCard } from './TemplateCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { incrementTemplateDownloads, createServerFromTemplate } from './actions';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  config: string;
  isBuiltIn: boolean;
  downloads: number;
  createdAt: Date;
}

interface TemplateGridProps {
  templates: Template[];
}

const CATEGORIES = [
  { value: 'all', label: 'All Templates', icon: '📦' },
  { value: 'sql', label: 'SQL', icon: '🗄️' },
  { value: 'rest', label: 'REST API', icon: '🌐' },
  { value: 'webhook', label: 'Webhook', icon: '🔔' },
  { value: 'javascript', label: 'JavaScript', icon: '⚡' },
];

export function TemplateGrid({ templates }: TemplateGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  // Filter templates by category and search query
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = async (template: Template) => {
    try {
      // Create server and tool from template
      const result = await createServerFromTemplate(template.id);

      if (result.success && result.serverId) {
        toast({
          variant: 'success',
          title: 'Server Created',
          description: result.message || 'Server created successfully from template',
        });

        // Navigate to new server's tools page
        router.push(`/servers/${result.serverId}/tools`);
      } else {
        toast({
          variant: 'error',
          title: 'Error',
          description: result.error || 'Failed to create server from template',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to use template',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="flex items-center gap-2"
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-2">No templates found</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Try adjusting your filters or search query
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUseTemplate={handleUseTemplate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
