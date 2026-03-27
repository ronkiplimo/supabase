import { redirect } from 'next/navigation'

type PartnerPageProps = {
  params: {
    partnerslug: string
  }
}

export default async function PartnerPage({ params }: PartnerPageProps) {
  const { partnerslug } = await params
  redirect(`/protected/${partnerslug}/items`)
}
