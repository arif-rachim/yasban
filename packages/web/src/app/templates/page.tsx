import { getTemplates } from './actions';
import { TemplateGrid } from './TemplateGrid';
import { BackButton } from '@/components/ui/back-button';

export const metadata = {
  title: 'Templates - Yasban',
  description: 'Browse and use built-in templates for your MCP tools',
};

export default async function TemplatesPage() {
  const { templates } = await getTemplates();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <BackButton fallbackHref="/" />

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Template Library
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a template to get started quickly with pre-configured tools
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TemplateGrid templates={templates} />
      </div>
    </div>
  );
}
