'use client';

import { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface MonacoSQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  connectionId?: string;
  height?: string;
  disabled?: boolean;
}

interface SchemaTable {
  name: string;
  columnCount: number;
}

interface SchemaColumn {
  tableName: string;
  name: string;
  type: string;
  nullable: boolean;
}

interface DatabaseSchema {
  tables: SchemaTable[];
  columns: SchemaColumn[];
}

export function MonacoSQLEditor({
  value,
  onChange,
  connectionId,
  height,
  disabled = false,
}: MonacoSQLEditorProps) {
  const [calculatedHeight, setCalculatedHeight] = useState<number>(150);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate editor height based on container
  useEffect(() => {
    if (!height && containerRef.current) {
      // Use ResizeObserver to dynamically adjust height
      const resizeObserver = new ResizeObserver(() => {
        if (containerRef.current) {
          const containerHeight = containerRef.current.clientHeight;
          // Use 80% of container height, with min 100px and max 300px
          const newHeight = Math.min(Math.max(containerHeight * 0.8, 100), 300);
          setCalculatedHeight(newHeight);
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [height]);

  // Configure Monaco autocomplete
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;

    // Register SQL autocomplete provider
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];

        // SQL Keywords
        const keywords = [
          'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
          'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
          'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
          'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
          'DROP', 'ALTER', 'ADD', 'COLUMN', 'AS', 'DISTINCT', 'COUNT', 'SUM',
          'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
        ];

        keywords.forEach((keyword) => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            sortText: `1_${keyword}`, // Sort keywords first
          });
        });

        // Add parameter placeholder suggestions
        const parameterPattern = /{{(\w+)}}/g;
        const text = model.getValue();
        const existingParams = new Set<string>();
        let match;
        while ((match = parameterPattern.exec(text)) !== null) {
          existingParams.add(match[1]);
        }

        existingParams.forEach((param) => {
          suggestions.push({
            label: `{{${param}}}`,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `{{${param}}}`,
            detail: 'Parameter',
            range,
            sortText: `4_${param}`, // Parameters last
          });
        });

        return { suggestions };
      },
    });
  };

  return (
    <div ref={containerRef} className="relative min-h-[100px]">
      {calculatedHeight &&
      <Editor key={`${calculatedHeight-20}`}
        height={calculatedHeight-20}
        language="sql"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          lineNumbers: 'on',
          readOnly: disabled,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showWords: true,
          },
        }}
      />
      }
    </div>
  );
}
