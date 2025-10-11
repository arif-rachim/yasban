'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface SchemaEditorProps {
  schema: Record<string, { type: string; description?: string; required?: boolean }>;
  onChange?: (schema: Record<string, { type: string; description?: string; required?: boolean }>) => void;
  editable?: boolean;
}

const JSON_SCHEMA_TYPES = ['string', 'number', 'integer', 'boolean', 'null', 'array', 'object'];

type SchemaRow = {
  columnName: string;
  type: string;
  required: boolean;
  description: string;
};

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

  const handleRequiredChange = (columnName: string, required: boolean) => {
    const updatedSchema = {
      ...localSchema,
      [columnName]: {
        ...localSchema[columnName],
        required,
      },
    };
    setLocalSchema(updatedSchema);
    if (onChange) {
      onChange(updatedSchema);
    }
  };

  // Transform schema object to array format for DataTable
  const schemaData: SchemaRow[] = useMemo(
    () =>
      Object.entries(localSchema).map(([name, schema]) => ({
        columnName: name,
        type: schema.type,
        required: schema.required || false,
        description: schema.description || '',
      })),
    [localSchema]
  );

  // Define columns with custom cell renderers
  const columns: ColumnDef<SchemaRow>[] = useMemo(
    () => [
      {
        accessorKey: 'columnName',
        header: 'Column Name',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
          const columnName = row.original.columnName;
          const type = row.original.type;

          return editable ? (
            <Select value={type} onValueChange={(value) => handleTypeChange(columnName, value)}>
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
            <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">{type}</span>
          );
        },
      },
      {
        accessorKey: 'required',
        header: 'Required',
        cell: ({ row }) => {
          const columnName = row.original.columnName;
          const required = row.original.required;

          return (
            <div className="flex justify-center">
              {editable ? (
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => handleRequiredChange(columnName, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
              ) : (
                <span className="text-sm">
                  {required ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-600">✗</span>
                  )}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'description',
        header: 'Description',
        cell: ({ row }) => {
          const columnName = row.original.columnName;
          const description = row.original.description;

          return editable ? (
            <Input
              value={description}
              onChange={(e) => handleDescriptionChange(columnName, e.target.value)}
              placeholder="Add description..."
              className="text-sm"
            />
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {description || (
                <span className="italic text-gray-400 dark:text-gray-600">No description</span>
              )}
            </span>
          );
        },
      },
    ],
    [editable, localSchema]
  );

  if (Object.keys(localSchema).length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
        No schema available. Run a test to capture the result schema.
      </div>
    );
  }

  return <DataTable columns={columns} data={schemaData} searchPlaceholder="Search columns..." />;
}
