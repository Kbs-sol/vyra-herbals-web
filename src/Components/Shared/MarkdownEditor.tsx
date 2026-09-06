'use client';

import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, 
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon, 
  Quote, Code, Eye, Edit3, Sparkles 
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  minHeight?: string;
}

export default function MarkdownEditor({ value, onChange, minHeight = '400px' }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = (before: string, after: string = '') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);

    onChange(newText);

    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const handleToolbarAction = (action: string) => {
    switch (action) {
      case 'bold': insertText('**', '**'); break;
      case 'italic': insertText('_', '_'); break;
      case 'h1': insertText('# ', ''); break;
      case 'h2': insertText('## ', ''); break;
      case 'h3': insertText('### ', ''); break;
      case 'ul': insertText('- ', ''); break;
      case 'ol': insertText('1. ', ''); break;
      case 'link': insertText('[', '](url)'); break;
      case 'image': insertText('![alt text](', ')'); break;
      case 'quote': insertText('> ', ''); break;
      case 'code': insertText('```\n', '\n```'); break;
    }
  };

  // Helper for ChatGPT pastes: ensure double newlines between blocks
  const optimizePaste = () => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    
    // Simple logic to ensure headings and lists have a blank line before them
    let optimized = textarea.value
      .replace(/([^\n])\n(#+ )/g, '$1\n\n$2') // headings
      .replace(/([^\n])\n(- )/g, '$1\n\n$2') // lists
      .replace(/([^\n])\n(\d+\. )/g, '$1\n\n$2'); // numbered lists
    
    onChange(optimized);
  };

  return (
    <div className="markdown-editor-root">
      <div className="editor-tabs">
        <button type="button" className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>
          <Edit3 size={16} /> Write
        </button>
        <button type="button" className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          <Eye size={16} /> Preview
        </button>
        {tab === 'write' && (
           <button type="button" className="btn-sparkle" onClick={optimizePaste} title="Fix ChatGPT Formatting">
             <Sparkles size={14} /> Format Paste
           </button>
        )}
      </div>

      {tab === 'write' ? (
        <div className="editor-container">
          <div className="toolbar">
            <div className="group">
              <button type="button" onClick={() => handleToolbarAction('h1')} title="H1"><Heading1 size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('h2')} title="H2"><Heading2 size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('h3')} title="H3"><Heading3 size={18} /></button>
            </div>
            <div className="group">
              <button type="button" onClick={() => handleToolbarAction('bold')} title="Bold"><Bold size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('italic')} title="Italic"><Italic size={18} /></button>
            </div>
            <div className="group">
              <button type="button" onClick={() => handleToolbarAction('ul')} title="Bullet List"><List size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('ol')} title="Numbered List"><ListOrdered size={18} /></button>
            </div>
            <div className="group">
              <button type="button" onClick={() => handleToolbarAction('link')} title="Link"><LinkIcon size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('image')} title="Image"><ImageIcon size={18} /></button>
            </div>
            <div className="group">
              <button type="button" onClick={() => handleToolbarAction('quote')} title="Quote"><Quote size={18} /></button>
              <button type="button" onClick={() => handleToolbarAction('code')} title="Code Block"><Code size={18} /></button>
            </div>
          </div>
          <textarea
            ref={textAreaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your blog content here... Supports Markdown."
            style={{ minHeight }}
          />
        </div>
      ) : (
        <div className="preview-container blog-content" style={{ minHeight }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*No content to preview*'}</ReactMarkdown>
        </div>
      )}

      <style jsx>{`
        .markdown-editor-root {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        .editor-tabs {
          display: flex;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 12px;
          gap: 8px;
          align-items: center;
        }
        .editor-tabs button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          background: transparent;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .editor-tabs button.active {
          background: white;
          color: #0f172a;
          border-color: #e5e7eb;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-sparkle {
          margin-left: auto;
          background: #fef2f2 !important;
          color: #dc2626 !important;
          border: 1px solid #fee2e2 !important;
        }
        .btn-sparkle:hover {
          background: #fee2e2 !important;
        }
        .toolbar {
          display: flex;
          padding: 6px 12px;
          background: #fff;
          border-bottom: 1px solid #f3f4f6;
          gap: 16px;
          flex-wrap: wrap;
        }
        .toolbar .group {
          display: flex;
          gap: 4px;
        }
        .toolbar button {
          padding: 6px;
          border-radius: 4px;
          color: #4b5563;
          cursor: pointer;
          transition: background 0.2s;
        }
        .toolbar button:hover {
          background: #f3f4f6;
          color: #111827;
        }
        textarea {
          width: 100%;
          padding: 16px;
          border: none;
          outline: none;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.6;
          resize: vertical;
          color: #111827;
        }
        .preview-container {
          padding: 20px;
          overflow-y: auto;
          background: #fff;
        }
      `}</style>
    </div>
  );
}
