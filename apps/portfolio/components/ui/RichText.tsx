import React from 'react'

type Props = {
  content: unknown
  className?: string
}

const RichText = ({ content, className }: Props) => {
  if (!content) return null

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(content as any).root?.children?.map((node: any, i: number) => {
        if (node.type === 'paragraph') {
          return (
            <p key={i}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {node.children?.map((child: any, j: number) => (
                <span key={j} className={child.format === 1 ? 'font-bold' : ''}>
                  {child.text}
                </span>
              ))}
            </p>
          )
        }
        if (node.type === 'heading') {
          const Tag = node.tag as 'h1' | 'h2' | 'h3'
          return (
            <Tag key={i}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {node.children?.[0]?.text}
            </Tag>
          )
        }
        return null
      })}
    </div>
  )
}

export default RichText
