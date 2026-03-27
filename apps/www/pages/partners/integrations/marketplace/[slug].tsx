import { type CodeHikeConfig, remarkCodeHike } from '@code-hike/mdx'
import { CH } from '@code-hike/mdx/components'
import { Boxes, ChevronLeft, ExternalLink } from 'lucide-react'
import { type GetStaticPaths, type GetStaticProps } from 'next'
import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { NextSeo } from 'next-seo'
import Image from 'next/image'
import Link from 'next/link'
import { type Dispatch, type SetStateAction, useState } from 'react'
import remarkGfm from 'remark-gfm'
import 'swiper/css'
import { Swiper, SwiperSlide } from 'swiper/react'

import { useBreakpoint, useFlag } from 'common'
import codeHikeTheme from 'config/code-hike.theme.json' with { type: 'json' }
import { Admonition } from 'ui-patterns/admonition'

import ImageModal from '~/components/ImageModal'
import DefaultLayout from '~/components/Layouts/Default'
import SectionContainer from '~/components/Layouts/SectionContainer'
import supabaseMarketplace, {
  type MarketplaceListingWithRelations,
} from '~/lib/supabaseMarketplace'
import Error404 from '../../../404'

function mdxComponents(callback: Dispatch<SetStateAction<string | null>>) {
  return {
    CH,
    Admonition,
    img: (
      props: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>
    ) => {
      return <img {...props} onClick={() => callback(props.src!)} />
    },
  }
}

type ListingPageProps = {
  listing: MarketplaceListingWithRelations
  overview: MDXRemoteSerializeResult<Record<string, unknown>, Record<string, unknown>> | null
}

function MarketplaceListingPage({ listing, overview }: ListingPageProps) {
  const [focusedImage, setFocusedImage] = useState<string | null>(null)
  const isNarrow = useBreakpoint('lg')
  const isMarketplaceEnabled = useFlag('marketplaceIntegrations')

  if (!listing || isMarketplaceEnabled === false) return <Error404 />

  const partnerName = listing.partner?.title ?? 'Unknown partner'
  const imageFiles = (listing.files ?? []).filter((url) =>
    /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(url)
  )

  return (
    <>
      <NextSeo
        title={`${listing.title} | Works With Supabase`}
        description={listing.summary ?? undefined}
        openGraph={{
          title: `${listing.title} | Works With Supabase`,
          description: listing.summary ?? undefined,
          url: `https://supabase.com/partners/integrations/marketplace/${listing.slug}`,
          images: imageFiles.length > 0 ? [{ url: imageFiles[0] }] : undefined,
        }}
      />

      {focusedImage ? (
        <ImageModal
          visible
          onCancel={() => setFocusedImage(null)}
          size="xxlarge"
          className="w-full outline-none"
        >
          <Image
            layout="responsive"
            objectFit="contain"
            width={1152}
            height={766}
            src={focusedImage!}
            alt={listing.title}
          />
        </ImageModal>
      ) : null}
      <DefaultLayout>
        <SectionContainer>
          <div className="col-span-12 mx-auto mb-2 max-w-5xl space-y-10 lg:col-span-2">
            {/* Back button */}
            <Link
              href="/partners/integrations"
              className="text-foreground hover:text-foreground-lighter flex cursor-pointer items-center transition-colors"
            >
              <ChevronLeft width={14} height={14} />
              Back
            </Link>

            <div className="flex items-center space-x-4">
              {listing.partner?.logo_url ? (
                <Image
                  layout="fixed"
                  width={56}
                  height={56}
                  className="bg-surface-200 flex-shrink-f0 h-14 w-14 rounded-full"
                  src={listing.partner.logo_url}
                  alt={listing.title}
                />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-surface-200">
                  <Boxes size={28} className="text-foreground-lighter" />
                </div>
              )}
              <h1 className="h1" style={{ marginBottom: 0 }}>
                {listing.title}
              </h1>
            </div>

            {imageFiles.length > 0 && (
              <div
                className="bg-gradient-to-t from-background-alternative to-background border-b p-6 [&_.swiper-container]:overflow-visible"
                style={{ marginLeft: 'calc(50% - 50vw)', marginRight: 'calc(50% - 50vw)' }}
              >
                <SectionContainer className="!py-0 !px-3 lg:!px-12 xl:!p-0 mx-auto max-w-5xl">
                  <Swiper
                    initialSlide={0}
                    spaceBetween={20}
                    slidesPerView={4}
                    speed={300}
                    grabCursor
                    centeredSlides={false}
                    centerInsufficientSlides={false}
                    breakpoints={{
                      320: { slidesPerView: 1.25, centeredSlides: false, spaceBetween: 10 },
                      720: { slidesPerView: 2, centeredSlides: false, spaceBetween: 10 },
                      920: { slidesPerView: 3, centeredSlides: false },
                      1024: { slidesPerView: 4 },
                      1280: { slidesPerView: 5 },
                    }}
                  >
                    {imageFiles.map((image, i) => (
                      <SwiperSlide key={i}>
                        <div className="relative block overflow-hidden rounded-md">
                          <Image
                            layout="responsive"
                            objectFit="contain"
                            placeholder="blur"
                            blurDataURL="/images/blur.png"
                            width={1460}
                            height={960}
                            src={image}
                            alt={listing.title}
                            onClick={() => setFocusedImage(image)}
                          />
                        </div>
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </SectionContainer>
              </div>
            )}

            <div className="grid gap-y-12 lg:grid-cols-8 lg:space-x-12">
              {isNarrow && <ListingDetails listing={listing} partnerName={partnerName} />}

              <div className="lg:col-span-5 overflow-hidden">
                <h2
                  className="text-foreground"
                  style={{ fontSize: '1.5rem', marginBottom: '1rem' }}
                >
                  Overview
                </h2>

                {overview ? (
                  <div className="prose">
                    <MDXRemote {...overview} components={mdxComponents(setFocusedImage)} />
                  </div>
                ) : listing.summary ? (
                  <p className="text-foreground-lighter">{listing.summary}</p>
                ) : (
                  <p className="text-foreground-lighter">No overview available.</p>
                )}
              </div>

              {!isNarrow && <ListingDetails listing={listing} partnerName={partnerName} />}
            </div>
          </div>
        </SectionContainer>
      </DefaultLayout>
    </>
  )
}

function ListingDetails({
  listing,
  partnerName,
}: {
  listing: MarketplaceListingWithRelations
  partnerName: string
}) {
  const categoryTitles = listing.categories?.map((c) => c.title) ?? []

  return (
    <div className="lg:col-span-3">
      <div className="sticky top-20 flex flex-col gap-4">
        <h2 className="text-foreground" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Details
        </h2>

        <div className="text-foreground divide-y">
          <div className="flex items-center justify-between py-2">
            <span className="text-foreground-lighter">Developer</span>
            <span className="text-foreground">{partnerName}</span>
          </div>

          {categoryTitles.length > 0 && (
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground-lighter">Category</span>
              <span className="text-foreground">{categoryTitles.join(', ')}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <span className="text-foreground-lighter">Type</span>
            <span className="text-foreground capitalize">{listing.type}</span>
          </div>

          {listing.partner?.website && (
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground-lighter">Website</span>
              <a
                href={listing.partner.website}
                target="_blank"
                rel="noreferrer"
                className="text-brand-link hover:underline transition-colors"
              >
                {new URL(listing.partner.website).host}
              </a>
            </div>
          )}

          {listing.documentation_url && (
            <div className="flex items-center justify-between py-2">
              <span className="text-foreground-lighter">Documentation</span>
              <a
                href={listing.documentation_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-link hover:underline transition-colors"
              >
                <span className="flex items-center space-x-1">
                  <span>Learn</span>
                  <ExternalLink width={14} height={14} />
                </span>
              </a>
            </div>
          )}
        </div>
        <p className="text-foreground-light text-sm">
          Third-party integrations and docs are managed by Supabase partners.
        </p>
      </div>
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { data: listings } = await supabaseMarketplace
    .from('listings')
    .select('slug')
    .eq('published', true)

  const paths =
    listings?.map(({ slug }) => ({
      params: { slug },
    })) ?? []

  return {
    paths,
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params!.slug as string

  const { data: listing, error } = await supabaseMarketplace
    .from('listings')
    .select(
      '*, categories:category_listings(...categories(slug, title)), partner:partners(title, logo_url, slug, website), listing_reviews(featured)'
    )
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()

  if (error || !listing) {
    return { notFound: true }
  }

  const codeHikeOptions: CodeHikeConfig = {
    theme: codeHikeTheme,
    lineNumbers: true,
    showCopyButton: true,
    skipLanguages: [],
    autoImport: false,
  }

  let overview: MDXRemoteSerializeResult | null = null
  if (listing.content) {
    try {
      overview = await serialize(listing.content, {
        blockJS: false,
        scope: { chCodeConfig: codeHikeOptions },
        mdxOptions: {
          remarkPlugins: [remarkGfm, [remarkCodeHike, codeHikeOptions]],
        },
      })
    } catch {
      // Fall back to rendering summary if MDX parsing fails
      overview = null
    }
  }

  return {
    props: { listing, overview },
    revalidate: 1800,
  }
}

export default MarketplaceListingPage
