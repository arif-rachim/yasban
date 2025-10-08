'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SchemaEditorProps {
  schema: Record<string, { type: string; description?: string }>;
  onChange?: (schema: Record<string, { type: string; description?: string }>) => void;
  editable?: boolean;
}

const JSON_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'null', 'array', 'object'];

export function SchemaEditor({ schema, onChange, editable = false }: SchemaEditorProps) {
  const [localSchema, setLocalSchema] = useState(schema);

  const handleTypeChange = (columnName: string, newType: string) => {
    const updatedSchema = {
      ...localSchema,
      [columnName]: {
        ...localSchema[columnName],
        type: newType,
      },
    };
    setLocalSchema(updatedSchema);
    if (onChange) {
      onChange(updatedSchema);
    }
  };

  const handleDescriptionChange = (columnName: string, newDescription: string) => {
    const updatedSchema = {
      ...localSchema,
      [columnName]: {
        ...localSchema[columnName],
        description: newDescription,
      },
    };
    setLocalSchema(updatedSchema);
    if (onChange) {
      onChange(updatedSchema);
    }
  };

  const columns = Object.keys(localSchema);

  if (columns.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
        No schema available. Run a test to capture the result schema.
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
              Column Name
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
              Type
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {columns.map((columnName) => {
            const columnSchema = localSchema[columnName];
            return (
              <tr key={columnName} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                  {columnName}
                </td>
                <td className="px-4 py-3">
                  {editable ? (
                    <Select
                      value={columnSchema.type}
                      onValueChange={(value) => handleTypeChange(columnName, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {JSON_SCHEMA_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                      {columnSchema.type}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editable ? (
                    <Input
                      value={columnSchema.description || ''}
                      onChange={(e) => handleDescriptionChange(columnName, e.target.value)}
                      placeholder="Add description..."
                      className="text-sm"
                    />
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {columnSchema.description || (
                        <span className="italic text-gray-400 dark:text-gray-600">
                          No description
                        </span>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
