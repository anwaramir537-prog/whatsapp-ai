import { useEffect } from 'react'

function setMeta(name, content) {
  if (!content) return
  let el = document.querySelector(`meta[name='${name}']`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setProp(property, content) {
  if (!content) return
  let el = document.querySelector(`meta[property='${property}']`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export default function SEO({ title, description, url, image, twitter = 'summary_large_image', jsonLd }) {
  useEffect(() => {
    if (title) document.title = title
    setMeta('description', description)
    setProp('og:title', title)
    setProp('og:description', description)
    if (url) setProp('og:url', url)
    if (image) setProp('og:image', image)
    setMeta('twitter:card', twitter)
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    if (image) setMeta('twitter:image', image)

    // JSON-LD structured data
    const prev = document.getElementById('jsonld-seo')
    if (prev) prev.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = 'jsonld-seo'
      script.text = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [title, description, url, image, twitter, jsonLd])
  return null
}
