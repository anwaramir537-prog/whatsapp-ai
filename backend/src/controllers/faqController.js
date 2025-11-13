import pdfParse from 'pdf-parse'
import prisma from '../db.js'

function extractQA(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items = []
  let i = 0
  while (i < lines.length) {
    if (/^q[:\-]/i.test(lines[i])) {
      const q = lines[i].replace(/^q[:\-]\s*/i, '')
      i++
      let a = ''
      if (i < lines.length && /^a[:\-]/i.test(lines[i])) {
        a = lines[i].replace(/^a[:\-]\s*/i, '')
        i++
      } else {
        a = lines[i] || ''
        i++
      }
      if (q) items.push({ question: q, answer: a || '...' })
      continue
    }
    i++
  }
  for (let j = 0; j < lines.length - 1; j++) {
    const q = lines[j]
    const a = lines[j + 1]
    if (/\?$/.test(q) && a && !/^q[:\-]|^a[:\-]/i.test(a)) {
      items.push({ question: q, answer: a })
    }
  }
  const seen = new Set()
  const unique = []
  for (const it of items) {
    const key = (it.question + '|' + it.answer).toLowerCase()
    if (!seen.has(key)) { seen.add(key); unique.push(it) }
  }
  return unique.slice(0, 500)
}

export async function uploadFAQ(req, res) {
  try {
    const { userId } = req.params
    if (String(req.user.id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' })
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const data = await pdfParse(req.file.buffer)
    const text = (data.text || '').trim()
    if (!text) return res.status(400).json({ error: 'PDF has no extractable text' })
    const items = extractQA(text)
    if (items.length === 0) return res.status(400).json({ error: 'No Q/A pairs detected' })
    const existing = await prisma.fAQ.findFirst({ where: { userId: Number(userId) } })
    if (existing) {
      await prisma.fAQ.update({ where: { id: existing.id }, data: { items } })
    } else {
      await prisma.fAQ.create({ data: { userId: Number(userId), items } })
    }
    res.json({ ok: true, count: items.length })
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' })
  }
}

export async function getFAQs(req, res) {
  try {
    const { userId } = req.params
    if (String(req.user.id) !== String(userId)) return res.status(403).json({ error: 'Forbidden' })
    const faq = await prisma.fAQ.findFirst({ where: { userId: Number(userId) } })
    res.json({ items: faq?.items || [] })
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed' })
  }
}
