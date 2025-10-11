'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface TemplateCardProps {
  template: Template;
  onUseTemplate: (template: Template) => void;
}

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors = {
      sql: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      rest: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      webhook: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      javascript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
    };
    return colors[category as keyof typeof colors] || colors.sql;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      sql: '🗄️',
      rest: '🌐',
      webhook: '🔔',
      javascript: '⚡',
    };
    return icons[category as keyof typeof icons] || '📦';
  };

  const formatConfig = () => {
    try {
      const config = JSON.parse(template.config);
      return JSON.stringify(config, null, 2);
    } catch {
      return template.config;
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCategoryIcon(template.category)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(template.category)}`}>
                  {template.category.toUpperCase()}
                </span>
                {template.isBuiltIn && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium rounded">
                    Built-in
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {template.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <span>📥 {template.downloads} uses</span>
          <span>📅 {new Date(template.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(true)}
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onUseTemplate(template)}
            className="flex-1"
          >
            Use Template
          </Button>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{getCategoryIcon(template.category)}</span>
              {template.name}
            </DialogTitle>
            <DialogDescription>
              {template.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</p>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(template.category)}`}>
                  {template.category.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Downloads</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{template.downloads} uses</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {template.isBuiltIn ? 'Built-in' : 'Custom'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Created</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {new Date(template.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Configuration Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Configuration
              </p>
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded text-xs overflow-y-auto overflow-x-hidden max-h-96 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                {formatConfig()}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowDetails(false);
                onUseTemplate(template);
              }}
            >
              Use This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
