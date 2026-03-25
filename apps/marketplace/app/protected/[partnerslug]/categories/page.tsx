import { notFound } from 'next/navigation'
import { Table, TableBody, TableHead, TableHeader, TableRow } from 'ui'
import { PageContainer } from 'ui-patterns/PageContainer'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderMeta,
  PageHeaderSummary,
  PageHeaderTitle,
} from 'ui-patterns/PageHeader'
import { PageSection, PageSectionContent } from 'ui-patterns/PageSection'

import { CategoryTableRowForm } from './category-table-row-form'
import { CreateCategoryForm } from './create-category-form'
import { createClient } from '@/lib/supabase/server'

type CategoriesPageProps = {
  params: {
    partnerslug: string
  }
}

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { partnerslug } = params
  const supabase = await createClient()

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id, slug, title, role')
    .eq('slug', partnerslug)
    .maybeSingle()

  if (partnerError || !partner || partner.role !== 'admin') {
    notFound()
  }

  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, title, description')
    .order('title', { ascending: true })

  if (categoriesError) {
    throw new Error(categoriesError.message)
  }

  const { data: categoryListings, error: categoryListingsError } = await supabase
    .from('category_listings')
    .select('category_id')

  if (categoryListingsError) {
    throw new Error(categoryListingsError.message)
  }

  const listingCountByCategoryId = new Map<number, number>()
  for (const categoryListing of categoryListings ?? []) {
    const nextCount = (listingCountByCategoryId.get(categoryListing.category_id) ?? 0) + 1
    listingCountByCategoryId.set(categoryListing.category_id, nextCount)
  }

  return (
    <>
      <PageHeader size="default">
        <PageHeaderMeta>
          <PageHeaderSummary>
            <PageHeaderTitle>Categories</PageHeaderTitle>
            <PageHeaderDescription>
              Create and manage marketplace categories for reviewed listings.
            </PageHeaderDescription>
          </PageHeaderSummary>
        </PageHeaderMeta>
      </PageHeader>

      <PageContainer size="default">
        <PageSection>
          <PageSectionContent>
            <CreateCategoryForm partnerSlug={partnerslug} />
          </PageSectionContent>
        </PageSection>

        <PageSection>
          <PageSectionContent>
            {categories?.length ? (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Listings</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <CategoryTableRowForm
                        key={category.id}
                        partnerSlug={partnerslug}
                        category={category}
                        itemCount={listingCountByCategoryId.get(category.id) ?? 0}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                No categories yet. Add your first category to start classifying listings.
              </div>
            )}
          </PageSectionContent>
        </PageSection>
      </PageContainer>
    </>
  )
}
