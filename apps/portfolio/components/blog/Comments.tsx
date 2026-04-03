'use client'

import Giscus from '@giscus/react'

export default function Comments() {
  return (
    <div className="mt-12 pt-8 border-t border-white/10">
      <Giscus
        id="comments"
        repo="YOUR_GITHUB_REPO"
        repoId="YOUR_REPO_ID"
        category="Announcements"
        categoryId="YOUR_CATEGORY_ID"
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
