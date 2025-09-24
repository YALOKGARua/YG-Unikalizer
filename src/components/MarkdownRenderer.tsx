import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    if (!content) return ''
    
    return content
      .replace(/```mermaid\n([\s\S]*?)\n```/g, (match, diagram) => {
        return `<div class="mermaid-diagram" data-diagram="${encodeURIComponent(diagram.trim())}">
          <div class="bg-slate-800/50 border border-white/20 rounded-lg p-4 my-4">
            <div class="text-sm text-slate-400 mb-2">📊 Диаграмма (Mermaid)</div>
            <pre class="text-xs text-slate-300 whitespace-pre-wrap">${diagram.trim()}</pre>
          </div>
        </div>`
      })
      .replace(/<img src="docs\/(.*?)" alt="(.*?)" .*?\/>/g, (match, src, alt) => {
        return `<div class="image-placeholder bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-6 my-4 text-center">
          <div class="text-blue-300 text-lg mb-2">🖼️ ${alt}</div>
          <div class="text-xs text-slate-400">${src}</div>
        </div>`
      })
  }, [content])

  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !className?.includes('language-')
            
            if (!isInline && language) {
              return (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={language}
                  PreTag="div"
                  className="rounded-lg !my-4"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            }
            
            return (
              <code 
                className="bg-slate-700/50 text-slate-200 px-1.5 py-0.5 rounded text-sm font-mono" 
                {...props}
              >
                {children}
              </code>
            )
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-slate-600 bg-slate-800/30 rounded-lg overflow-hidden">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return (
              <thead className="bg-slate-700/50">
                {children}
              </thead>
            )
          },
          th({ children }) {
            return (
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider border-b border-slate-600">
                {children}
              </th>
            )
          },
          td({ children }) {
            return (
              <td className="px-4 py-3 text-sm text-slate-200 border-b border-slate-700/50">
                {children}
              </td>
            )
          },
          tr({ children }) {
            return (
              <tr className="hover:bg-slate-700/20 transition-colors">
                {children}
              </tr>
            )
          },
          h1({ children }) {
            return (
              <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text mb-4">
                {children}
              </h1>
            )
          },
          h2({ children }) {
            return (
              <h2 className="text-2xl font-bold text-white mb-3 mt-8 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded"></div>
                {children}
              </h2>
            )
          },
          h3({ children }) {
            return (
              <h3 className="text-xl font-semibold text-slate-200 mb-3 mt-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                {children}
              </h3>
            )
          },
          h4({ children }) {
            return (
              <h4 className="text-lg font-medium text-slate-300 mb-2 mt-4">
                {children}
              </h4>
            )
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-yellow-500/50 bg-yellow-500/10 pl-4 py-2 my-4 rounded-r-lg">
                <div className="text-yellow-200 text-sm">
                  {children}
                </div>
              </blockquote>
            )
          },
          a({ href, children }) {
            return (
              <a 
                href={href} 
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          ul({ children }) {
            return (
              <ul className="list-none space-y-1 my-4">
                {children}
              </ul>
            )
          },
          li({ children }) {
            const content = String(children)
            if (content.includes('✅') || content.includes('🎯') || content.includes('📷')) {
              return (
                <li className="flex items-start gap-2 text-slate-200">
                  {children}
                </li>
              )
            }
            return (
              <li className="flex items-start gap-2 text-slate-200">
                <span className="text-blue-400 mt-1">•</span>
                <span>{children}</span>
              </li>
            )
          },
          div({ className, children, ...props }) {
            if (className?.includes('mermaid-diagram')) {
              return <div className={className} {...props}>{children}</div>
            }
            return <div className={className} {...props}>{children}</div>
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}