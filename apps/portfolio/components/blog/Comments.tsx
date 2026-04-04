'use client'

import Giscus from '@giscus/react'

export default function Comments() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO as any
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID as any
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY as any
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID as any

  if (!repo || !repoId || !categoryId) {
    return (
      <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
        Comments configuration is incomplete.
      </div>
    )
  }

  return (
    <div className="mt-12 pt-8 border-t border-white/10">
      <Giscus
        id="comments"
        repo={repo}
        repoId={repoId}
        category={category || "Announcements"}
        categoryId={categoryId}
        mapping="pathname"
        term="Welcome to my portfolio!"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="dark"
        lang="en"
        loading="lazy"
      />
    </div>
  )
}
