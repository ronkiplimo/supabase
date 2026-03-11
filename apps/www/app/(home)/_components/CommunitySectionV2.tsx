'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { topTweets } from 'shared-data/tweets'
import { Button } from 'ui'
import { TweetCard } from 'ui-patterns/TweetCard'

const TWEETS_PER_PAGE = 15

export function CommunitySectionV2() {
  const [page, setPage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPage((p) => p + 1)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const currentTweets = Array.from({ length: TWEETS_PER_PAGE }, (_, i) => {
    const idx = (page * TWEETS_PER_PAGE + i) % topTweets.length
    return topTweets[idx]
  })

  return (
    <div className="border-b border-border">
      <div className="mx-auto max-w-[var(--container-max-w,75rem)] border-x border-border">
        <div className="flex flex-col items-center gap-3 px-6 py-20">
          <h3 className="text-2xl md:text-4xl text-center">Join the community</h3>
          <p className="text-foreground-lighter text-center text-sm">
            Discover what our community has to say about their Supabase experience.
          </p>
          <Button asChild type="default" size="small" className="mt-2">
            <Link href="https://discord.supabase.com/" target="_blank">
              Join us on Discord
            </Link>
          </Button>
        </div>

        <div
          className="relative overflow-hidden h-[620px]"
          style={{
            maskImage:
              'linear-gradient(to bottom, black 50%, transparent 100%), linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 50%, transparent 100%), linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'destination-in',
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={page}
              className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-2 -mx-4"
            >
              {currentTweets.map((tweet, i) => (
                <motion.div
                  key={tweet.url}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.03,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="break-inside-avoid mb-2"
                >
                  <Link href={tweet.url} target="_blank" className="block group/tweet-card">
                    <TweetCard
                      handle={`@${tweet.handle}`}
                      quote={tweet.text}
                      img_url={tweet.img_url}
                    />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
