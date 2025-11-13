import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO'

export default function Marketing() {
  const title = 'Wrap AI — WhatsApp Assistant for FAQ, AI & Voice Notes'
  const desc = 'Automate WhatsApp with your own FAQ + Groq AI fallback. Send friendly text and synchronized voice notes. Live analytics, multi-tenant, Socket.io realtime.'

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Wrap AI",
    url: typeof window !== 'undefined' ? window.location.origin : undefined,
    logo: "/og-image.png",
    sameAs: [
      "https://x.com/",
      "https://www.linkedin.com/"
    ]
  }
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Wrap AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: desc,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "124"
    }
  }
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Wrap AI",
    description: desc,
    brand: { "@type": "Organization", name: "Wrap AI" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "124"
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO title={title} description={desc} jsonLd={[orgJsonLd, productJsonLd, productSchema]} />
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-xl">Wrap AI</div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-indigo-600">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600">How it works</a>
            <a href="#pricing" className="hover:text-indigo-600">Pricing</a>
            <Link to="/case-studies" className="hover:text-indigo-600">Case Studies</Link>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm">Login</Link>
            <Link to="/signup" className="px-3 py-2 text-sm rounded bg-indigo-600 text-white">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">Turn WhatsApp into your smartest assistant</h1>
            <p className="mt-4 text-gray-700">Wrap AI replies with your own FAQ first, then falls back to Groq for accurate, friendly answers. Every reply ships with a synchronized voice note. Real‑time dashboard, multi‑tenant, and analytics built‑in.</p>
            <div className="mt-6 flex gap-3">
              <Link to="/signup" className="px-4 py-2 rounded bg-indigo-600 text-white">Start free</Link>
              <a href="#features" className="px-4 py-2 rounded border">See features</a>
            </div>
            <div className="mt-4 text-xs text-gray-500">No credit card required. WhatsApp-safe and fast.</div>
          </div>
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="text-sm font-semibold">Live Preview</div>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>• Upload FAQ PDF or CSV</li>
              <li>• Connect WhatsApp via QR</li>
              <li>• AI replies with text + voice note</li>
              <li>• Analytics: FAQ vs AI, response volume</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold">Built for engagement and speed</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            { title: 'FAQ-first replies', desc: 'Respond instantly using your uploaded FAQ. Fall back to AI only when needed.' },
            { title: 'Groq answers', desc: 'State-of-the-art responses labeled ai (groq) for clarity and trust.' },
            { title: 'Voice notes (PTT)', desc: 'Every text reply is synchronized with a short voice note.' },
            { title: 'Multi-tenant & secure', desc: 'User-isolated sessions, JWT auth, Socket.io rooms.' },
            { title: 'Live analytics', desc: 'Track volume, FAQ coverage, and AI usage. Windowed queries for speed.' },
            { title: 'Real-time UI', desc: 'Socket.io status, message stream, and QR events.' },
          ].map((f, i) => (
            <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="font-semibold">{f.title}</div>
              <div className="text-sm text-gray-700 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-indigo-50">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Upload your FAQ', desc: 'PDF or CSV (Question,Answer). Edit in the dashboard anytime.' },
            { step: '2', title: 'Connect WhatsApp', desc: 'Scan a secure QR and we persist the session. Auto-reconnect on drop.' },
            { step: '3', title: 'Start chatting', desc: 'Customers get concise text + voice answers using your knowledge.' },
          ].map((s) => (
            <div key={s.step} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="text-indigo-600 text-sm font-semibold">Step {s.step}</div>
              <div className="font-bold mt-1">{s.title}</div>
              <div className="text-sm text-gray-700 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-bold">Simple pricing</h2>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', price: '$0', notes: ['1 WhatsApp session', 'FAQ upload', 'AI + voice replies'] },
            { name: 'Growth', price: '$49.00', notes: ['Up to 3 sessions', 'Premium TTS voices', 'Priority support'] },
            { name: 'Add-on', price: '$3.00', notes: ['Optional add-on item'] },
            { name: 'Scale', price: 'Custom', notes: ['10+ sessions', 'SLA & SSO', 'Advanced analytics'] },
          ].map((p) => (
            <div key={p.name} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="font-bold text-lg">{p.name}</div>
              <div className="text-2xl mt-2">{p.price}</div>
              <ul className="mt-4 text-sm text-gray-700 space-y-1">
                {p.notes.map((n, i) => <li key={i}>• {n}</li>)}
              </ul>
              <div className="mt-6">
                <Link to="/signup" className="px-4 py-2 rounded bg-indigo-600 text-white">Get started</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Case Studies / Testimonials */}
      <section id="testimonials" className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold">What our customers say</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              { name: 'Noorvia Enterprise', quote: 'Wrap AI cut our response time to seconds and boosted conversions with voice answers.' },
              { name: 'Aria Studio', quote: 'FAQ-first replies made our support scalable without losing the brand tone.' },
              { name: 'Khan Digital', quote: 'The dashboard and analytics helped us prioritize top customer intents quickly.' },
            ].map((t, i) => (
              <div key={i} className="border rounded-lg p-6 bg-white shadow-sm">
                <div className="text-gray-800">“{t.quote}”</div>
                <div className="mt-3 text-sm text-gray-600">— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold">Frequently asked questions</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-6 text-sm text-gray-700">
            <div>
              <div className="font-semibold">Is my data secure?</div>
              <p>Yes. Each user’s WhatsApp session and FAQ store are isolated. We never mix tenants.</p>
            </div>
            <div>
              <div className="font-semibold">Can I edit my FAQs?</div>
              <p>Use the built-in FAQ Manager to add, edit, delete, or import CSV.</p>
            </div>
            <div>
              <div className="font-semibold">Do you support voice replies?</div>
              <p>Yes. We generate synchronized voice notes for every text reply using OpenAI TTS.</p>
            </div>
            <div>
              <div className="font-semibold">What happens if WhatsApp disconnects?</div>
              <p>We auto-reconnect and re-emit a fresh QR if needed. Your session is persisted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600 flex flex-col md:flex-row items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Wrap AI. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#features" className="hover:text-indigo-600">Features</a>
            <a href="#pricing" className="hover:text-indigo-600">Pricing</a>
            <Link to="/case-studies" className="hover:text-indigo-600">Case Studies</Link>
            <a href="#faq" className="hover:text-indigo-600">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
