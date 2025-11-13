import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function CaseStudies() {
  const base = typeof window !== 'undefined' ? window.location.origin : ''

  const articles = [
    {
      headline: 'E-commerce: 37% faster support and +18% conversion via FAQ-first replies',
      slug: 'ecommerce-faq-conversion',
      description:
        'A DTC apparel brand replaced manual WhatsApp responses with Wrap AI. Using uploaded FAQs and Groq fallback, median reply time dropped from 2m 10s to 41s and add-to-cart-to-purchase conversion increased by 18%.',
      body:
        'The team ingested product, shipping, and return FAQs (218 Q/A). Wrap AI covered 72% of intents without AI fallback. For remaining long-tail queries, Groq produced concise, brand-aligned responses. OpenAI TTS voice notes improved engagement for high-intent queries (size, material, care). Over 6 weeks: median response time fell 69%, NPS rose from 47→56, and revenue per WhatsApp session increased 11%.',
      metrics: [
        '−69% median response time (2m10s → 41s)',
        '+18% conversion rate from chat to purchase',
        '+11% revenue per WhatsApp session',
      ],
      datePublished: '2025-05-12',
    },
    {
      headline: 'EdTech: Scalable admissions Q&A with 84% FAQ coverage',
      slug: 'edtech-admissions-scale',
      description:
        'An online academy automated admissions Q&A across ~1,900 daily messages. With refreshed FAQ import (CSV) and Socket-driven status, human load dropped by 63% while satisfaction remained high.',
      body:
        'The academy uploaded a CSV of admissions, course dates, pricing, and scholarships with 356 entries. Wrap AI matched 84% of questions to FAQs using a fast Jaccard matcher, reserving AI for the rest. With analytics windowing and indexes, the team tracked intent trends and quickly updated content. Result: 63% fewer human escalations with a 4.7/5 rating for response helpfulness.',
      metrics: [
        '84% of messages answered from FAQs',
        '−63% human escalations',
        '4.7/5 helpfulness rating (self-reported)',
      ],
      datePublished: '2025-06-03',
    },
    {
      headline: 'Agencies: Multi-tenant onboarding with persistent WhatsApp sessions',
      slug: 'agency-multitenant-onboarding',
      description:
        'A marketing agency onboarded 12 client numbers using multi-tenant Baileys sessions. Auto-reconnect + 401 recovery eliminated QR resets, enabling hands-off reliability.',
      body:
        'Using Baileys with useMultiFileAuthState, each client’s session persisted under a separate directory. On 401, the system auto-cleans auth and re-emits a fresh QR, removing manual intervention. With provider labels in the UI, the team audited responses, and with runtime log-level toggles, they debugged rare decrypt retries without redeploying.',
      metrics: [
        '12 client WhatsApp sessions, isolated on disk',
        'Zero manual QR resets after rollout',
        'Sub-1s dashboard load with windowed analytics',
      ],
      datePublished: '2025-07-22',
    },
  ]

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base + '/' },
      { '@type': 'ListItem', position: 2, name: 'Case Studies', item: base + '/case-studies' },
    ],
  }

  const articlesJsonLd = articles.map((a) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.headline,
    description: a.description,
    author: { '@type': 'Organization', name: 'Wrap AI' },
    datePublished: a.datePublished,
    mainEntityOfPage: base + '/case-studies#' + a.slug,
  }))

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Case Studies — Wrap AI"
        description="Real-world results from WhatsApp automation with FAQ-first replies, Groq AI fallback, and voice notes."
        jsonLd={[breadcrumbJsonLd, ...articlesJsonLd]}
      />

      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link to="/" className="font-semibold">Wrap AI</Link>
          <div className="text-sm">
            <Link to="/signup" className="px-3 py-2 rounded bg-indigo-600 text-white">Get Started</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold">Case Studies</h1>
        <p className="mt-3 text-gray-700 max-w-3xl">
          See how teams automate WhatsApp with FAQ-first replies, reliable Baileys sessions, and synchronized voice notes.
        </p>

        <div className="mt-10 space-y-12">
          {articles.map((a) => (
            <article key={a.slug} id={a.slug} className="prose max-w-none">
              <h2 className="text-2xl font-bold">{a.headline}</h2>
              <div className="mt-1 text-sm text-gray-500">Published {a.datePublished}</div>
              <p className="mt-4 text-gray-800">{a.description}</p>
              <p className="mt-3 text-gray-800">{a.body}</p>
              <ul className="mt-4 list-disc pl-5 text-gray-800">
                {a.metrics.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12 border-t pt-6 text-sm text-gray-600">
          Want similar results? <Link to="/signup" className="text-indigo-600 underline">Start free</Link> or <Link to="/login" className="text-indigo-600 underline">log in</Link>.
        </div>
      </main>
    </div>
  )
}
