import dayjs from 'dayjs'
import Image from 'next/image'
import Link from 'next/link'

import authors from '@/lib/authors.json'
import type Author from '@/types/author'
import type PostTypes from '@/types/post'
import AuthorAvatars from './AuthorAvatars'

interface Props {
  post: PostTypes
}

const BlogGridItem = ({ post }: Props) => {
  const authorArray: string[] | undefined = post.author ? post.author.split(',') : []
  const author = []

  if (authorArray) {
    for (let i = 0; i < authorArray.length; i++) {
      author.push(
        authors.find((authors: Author) => {
          return authors.author_id === authorArray[i]
        })
      )
    }
  }

  const resolveImagePath = (img: string | undefined): string | null => {
    if (!img) return null
    return img.startsWith('/') || img.startsWith('http') ? img : `/images/blog/${img}`
  }

  const imageUrl =
    resolveImagePath(post.imgThumb) ||
    resolveImagePath(post.imgSocial) ||
    '/images/blog/blog-placeholder.png'

  return (
    <Link
      href={post.path}
      prefetch={false}
      className="group flex flex-col h-full p-6"
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden rounded-md border border-foreground/10">
        <Image
          fill
          sizes="100%"
          quality={100}
          src={imageUrl}
          className="object-cover"
          alt={`${post.title} thumbnail`}
        />
      </div>
      <div className="flex flex-col gap-1 pt-4">
        <h3 className="text-foreground text-lg group-hover:underline">{post.title}</h3>
        <p className="text-foreground-lighter text-sm mt-1 line-clamp-2">{post.description}</p>
        {post.date && (
          <div className="text-foreground-lighter flex items-center space-x-1.5 text-[11px] mt-3">
            <p>{dayjs(post.date).format('D MMM YYYY')}</p>
            {post.readingTime && (
              <>
                <p>•</p>
                <p>{post.readingTime}</p>
              </>
            )}
          </div>
        )}
        <div className="mt-1.5">
          <AuthorAvatars authors={author} />
        </div>
      </div>
    </Link>
  )
}

export default BlogGridItem
