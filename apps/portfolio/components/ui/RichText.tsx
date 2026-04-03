import React from 'react'

type Props = {
  content: any
  className?: string
}

const RichText = ({ content, className }: Props) => {
  if (!content) return null

  // This is a simplified Lexical renderer. 
  // For a production app, you'd use a more robust renderer.
  // Payload v3 provides blocks and other features that need careful handling.
  
  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      {/* For now, we'll just show the text if it's simple, or a placeholder */}
      {content.root?.children?.map((node: any, i: number) => {
        if (node.type === 'paragraph') {
          return (
            <p key={i}>
              {node.children?.map((child: any, j: number) => (
                <span key={j} className={child.format === 1 ? 'font-bold' : ''}>
                  {child.text}
                </span>
              ))}
            </p>
          )
        }
        if (node.type === 'heading') {
          const Tag = node.tag as any
          return <Tag key={i}>{node.children?.[0]?.text}</Tag>
        }
        return null
      })}
    </div>
  )
}

export default RichText
