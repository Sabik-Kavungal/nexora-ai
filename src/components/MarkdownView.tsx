import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple, robust Markdown parser
  const renderFormatted = () => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let codeBlockIndex = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code Block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        const fullCode = codeLines.join('\n');
        const currIdx = codeBlockIndex++;
        elements.push(
          <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-[#30363D] bg-[#010409] shadow-xs">
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#161B22] border-b border-[#30363D] text-xs text-[#8B949E] font-mono">
              <span className="font-semibold">{lang || 'code'}</span>
              <button
                onClick={() => handleCopy(fullCode, currIdx)}
                className="flex items-center gap-1 hover:text-[#F0F6FC] transition-colors cursor-pointer"
              >
                {copiedIndex === currIdx ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#3FB950]" />
                    <span className="text-[#3FB950] font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#8B949E]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 text-xs font-mono text-[#F0F6FC] bg-[#010409] overflow-x-auto whitespace-pre">
              <code>{fullCode}</code>
            </pre>
          </div>
        );
        i++;
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold text-[#F0F6FC] mt-4 mb-2">
            {formatInline(line.slice(4))}
          </h3>
        );
        i++;
        continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg font-bold text-[#F0F6FC] mt-4 mb-2">
            {formatInline(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl font-bold text-[#F0F6FC] mt-5 mb-2.5">
            {formatInline(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote
            key={`bq-${i}`}
            className="border-l-2 border-[#1877F2] pl-3 py-1 bg-[#21262D]/60 my-2 text-sm italic text-[#8B949E] rounded-r-md"
          >
            {formatInline(line.slice(2))}
          </blockquote>
        );
        i++;
        continue;
      }

      // Bullet lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().slice(2);
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-sm text-[#F0F6FC] my-0.5 leading-relaxed">
            {formatInline(bulletText)}
          </li>
        );
        i++;
        continue;
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <li key={`oli-${i}`} className="ml-5 list-decimal text-sm text-[#F0F6FC] my-0.5 leading-relaxed">
            {formatInline(numMatch[2])}
          </li>
        );
        i++;
        continue;
      }

      // Empty line / paragraph spacer
      if (!line.trim()) {
        elements.push(<div key={`sp-${i}`} className="h-2" />);
        i++;
        continue;
      }

      // Standard paragraph
      elements.push(
        <p key={`p-${i}`} className="text-sm text-[#F0F6FC] leading-relaxed my-1">
          {formatInline(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  const formatInline = (text: string) => {
    // Bold **text**
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-[#F0F6FC]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-[#8B949E]">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 text-xs font-mono bg-[#21262D] text-[#58A6FF] font-semibold rounded border border-[#30363D]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return <div className="space-y-0.5 max-w-none">{renderFormatted()}</div>;
};
