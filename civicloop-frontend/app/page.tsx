'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Camera,
  CircleCheck,
  Clock3,
  CloudSun,
  HandHeart,
  HeartHandshake,
  Leaf,
  MapPin,
  Menu,
  Mic,
  PackageCheck,
  Recycle,
  RefreshCw,
  Truck,
  Users,
  X,
} from 'lucide-react'

// ⚠️ Replace this with your own API Gateway URL if it changes
const API_BASE = 'https://5icz9ihs21.execute-api.ap-south-1.amazonaws.com/Prod'

type Report = {
  id: string
  type: string
  itemName: string
  quantity: string
  location: string
  status: string
  claimedBy: string
  createdAt: string
}

const actions = [
  { title: 'Donate food', copy: 'Give surplus a second life.', icon: HandHeart, color: 'amber' },
  { title: 'Donate groceries', copy: 'Stock a community pantry.', icon: PackageCheck, color: 'orange' },
  { title: 'Civic reporting', copy: 'Flag food waste nearby.', icon: BarChart3, color: 'lime' },
  { title: 'Cold storage tracker', copy: 'Keep every handoff safe.', icon: CloudSun, color: 'blue' },
  { title: 'NGO request board', copy: 'Match needs with supply.', icon: Users, color: 'pink' },
  { title: 'Logistics pickup', copy: 'Move meals where needed.', icon: Truck, color: 'violet' },
]

function JaggedEdge({ flip = false }: { flip?: boolean }) {
  return <div aria-hidden="true" className={`jagged-edge ${flip ? 'jagged-edge-flip' : ''}`} />
}

function iconFor(type: string) {
  if (type === 'citizen') return '📍'
  return '🍱'
}

const workingActions: Record<string, string> = {
  'Donate food': 'donor',
  'Civic reporting': 'citizen',
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('All')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // form state
  const [fItem, setFItem] = useState('')
  const [fQty, setFQty] = useState('')
  const [fUnit, setFUnit] = useState('kg')
  const [fLocation, setFLocation] = useState('')
  const [fType, setFType] = useState('donor')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(true)

  function parseVoiceInput(text: string) {
    const lower = text.toLowerCase()

    // quantity + unit, e.g. "5 kg", "20 servings", "3 boxes"
    const qtyMatch = lower.match(/(\d+)\s*(kg|kilograms?|g|grams?|servings?|serving|boxes?|box|pieces?|plates?)/)
    if (qtyMatch) {
      setFQty(qtyMatch[1])
      const unitWord = qtyMatch[2]
      if (unitWord.startsWith('kg') || unitWord.startsWith('kilo')) setFUnit('kg')
      else if (unitWord.startsWith('serv')) setFUnit('servings')
      else if (unitWord.startsWith('box')) setFUnit('boxes')
    }

    // location after "at" / "in" / "near"
    const locMatch = lower.match(/\b(?:at|in|near)\s+([a-z\s]+?)(?:[.,]|$)/)
    if (locMatch) {
      const loc = locMatch[1].trim()
      setFLocation(loc.replace(/\b\w/g, (c) => c.toUpperCase()))
    }

    // item name: strip quantity phrase, location phrase, filler words
    let itemPart = lower
    if (qtyMatch) itemPart = itemPart.replace(qtyMatch[0], '')
    if (locMatch) itemPart = itemPart.replace(locMatch[0], '')
    itemPart = itemPart
      .replace(/\b(available|for donation|donate|donating|surplus|extra|of|is|are|there)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (itemPart) {
      setFItem(itemPart.replace(/\b\w/g, (c) => c.toUpperCase()))
    }
  }

  function handleVoiceInput() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      setVoiceSupported(false)
      return
    }

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setVoiceTranscript('')
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setVoiceTranscript(transcript)
      parseVoiceInput(transcript)
    }

    recognition.onerror = () => {
      setListening(false)
      setVoiceTranscript('❌ Could not hear that. Try again or type manually.')
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.start()
  }

  async function loadReports() {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`${API_BASE}/reports`)
      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      console.error(err)
      setLoadError('Could not load listings. Check your API URL or CORS setup.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const visibleListings = useMemo(() => {
    if (filter === 'All') return reports
    if (filter === 'Claimed') return reports.filter((r) => r.status === 'claimed')
    if (filter === 'Pending') return reports.filter((r) => r.status === 'pending')
    return reports
  }, [filter, reports])

  const totalMeals = reports.length
  const claimedCount = reports.filter((r) => r.status === 'claimed').length

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setFormMsg('')
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: fType,
          itemName: fItem,
          quantity: `${fQty} ${fUnit}`,
          location: fLocation,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setFormMsg('✅ Published! Closing…')
      await loadReports()
      setTimeout(() => {
        setModalOpen(false)
        setFormMsg('')
        setFItem('')
        setFQty('')
        setFLocation('')
      }, 900)
    } catch (err) {
      console.error(err)
      setFormMsg('❌ Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleActionClick(title: string) {
    const presetType = workingActions[title]
    if (presetType) {
      setFType(presetType)
      setModalOpen(true)
    } else {
      window.alert(`"${title}" is on our roadmap for the next build — not part of this weekend's working demo yet.`)
    }
  }

  async function handleClaim(id: string) {
    const ngoName = window.prompt('Claiming as which NGO / volunteer?', 'Hope NGO')
    if (!ngoName) return
    try {
      const res = await fetch(`${API_BASE}/reports/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'claimed', claimedBy: ngoName }),
      })
      if (!res.ok) throw new Error('Request failed')
      await loadReports()
      window.alert(`Ask the volunteer to open this link on their phone:\n\n${window.location.origin}/share?id=${id}`)
    } catch (err) {
      console.error(err)
      window.alert('Could not claim this report. Try again.')
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#eae3c9] text-[#1f0e07]">
      <header className="sticky top-0 z-30 border-b border-[#1f0e07]/10 bg-[#f4efe0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <a href="#top" className="font-display text-2xl font-black tracking-[-0.06em]">NOURISH<span className="text-[#ff5c00]">.</span></a>
          <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-[0.12em] md:flex">
            <a className="transition hover:text-[#ff5c00]" href="#how-it-works">How it works</a>
            <a className="transition hover:text-[#ff5c00]" href="#listings">Find food</a>
            <a className="transition hover:text-[#ff5c00]" href="#impact">Our impact</a>
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <div className="text-right text-xs"><span className="block font-bold">{totalMeals} reports</span><span className="text-[#1f0e07]/55">logged so far</span></div>
            <button onClick={() => setModalOpen(true)} className="rounded-full bg-[#ffb800] px-5 py-3 text-xs font-black uppercase tracking-wide transition hover:-translate-y-0.5 hover:bg-[#ff5c00]">Donate now <ArrowRight className="ml-2 inline size-4" /></button>
          </div>
          <button aria-label="Toggle navigation" className="rounded-full border border-[#1f0e07]/20 p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
        {menuOpen && <nav className="grid gap-4 border-t border-[#1f0e07]/10 px-5 py-5 text-sm font-bold uppercase md:hidden"><a href="#how-it-works">How it works</a><a href="#listings">Find food</a><a href="#impact">Our impact</a><button onClick={() => setModalOpen(true)} className="w-full rounded-full bg-[#ffb800] px-4 py-3 text-left">Donate now <ArrowRight className="ml-2 inline size-4" /></button></nav>}
      </header>

      <section id="top" className="relative bg-[#f4efe0] px-5 pb-20 pt-16 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1f0e07]/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em]"><span className="size-2 rounded-full bg-[#ff5c00]" /> Good food should go further</div>
            <h1 className="font-display max-w-3xl text-[clamp(3.4rem,8vw,7.4rem)] font-black uppercase leading-[.82] tracking-[-0.075em]">Donate surplus food.<br /><span className="text-[#ff5c00]">Save lives.</span></h1>
            <p className="mt-8 max-w-lg text-base leading-7 text-[#1f0e07]/65">Nourish connects restaurants, shops and neighbors with NGOs — turning extra food into real meals, tracked live on AWS.</p>
            <div className="mt-9 flex flex-wrap gap-3"><button onClick={() => setModalOpen(true)} className="rounded-full bg-[#ff5c00] px-6 py-4 text-sm font-black uppercase text-white shadow-[5px_5px_0_#1f0e07] transition hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#1f0e07]">Log surplus food <ArrowRight className="ml-2 inline size-4" /></button><a href="#listings" className="rounded-full border border-[#1f0e07]/25 px-6 py-4 text-sm font-black uppercase transition hover:bg-[#1f0e07] hover:text-[#f4efe0]">View listings</a></div>
            <div className="mt-12 flex flex-wrap gap-3"><div className="rounded-2xl bg-[#ffb800] px-4 py-3"><strong className="block text-xl font-black">{totalMeals}</strong><span className="text-[11px] font-bold uppercase">total reports</span></div><div className="rounded-2xl border border-[#1f0e07]/15 bg-white/40 px-4 py-3"><strong className="block text-xl font-black">{claimedCount}</strong><span className="text-[11px] font-bold uppercase">claimed by NGOs</span></div></div>
          </div>
          <div className="relative mx-auto w-full max-w-[720px]">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-black shadow-[14px_14px_0_#1f0e07]">
              <img src="/hero-food.webp" alt="Fresh food ready to donate" className="absolute inset-0 h-full w-full object-contain" />
              <div className="absolute -right-3 top-8 grid size-28 place-content-center rounded-full bg-[#ffb800] text-center font-black leading-none shadow-lg"><span className="text-3xl">AWS</span><span className="text-[10px] uppercase">powered</span></div>
              <span className="absolute bottom-8 left-8 max-w-[190px] font-display text-4xl font-black uppercase leading-[.85] tracking-[-.06em] text-[#f4efe0]">Every bite counts.</span>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative bg-[#1f0e07] px-5 pb-24 pt-24 text-[#f4efe0] lg:px-10"><JaggedEdge /><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-xs font-black uppercase tracking-[.22em] text-[#ffb800]">The Nourish network</p><h2 className="font-display max-w-2xl text-5xl font-black uppercase leading-[.88] tracking-[-.06em] md:text-7xl">Small actions.<br />Big nourishment.</h2></div><p className="max-w-xs text-sm leading-6 text-[#f4efe0]/55">From a single extra tray to a city-wide movement, we make sharing food feel easy.</p></div><div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{actions.map(({ title, copy, icon: Icon, color }, index) => <button key={title} onClick={() => handleActionClick(title)} className="group relative min-h-52 overflow-hidden rounded-3xl border border-[#ffb800]/20 bg-[#2a150d] p-6 text-left transition hover:-translate-y-1 hover:border-[#ffb800]/70"><span className="absolute right-5 top-5 text-xs font-bold text-[#f4efe0]/30">0{index + 1}</span>{workingActions[title] && <span className="absolute right-5 top-12 rounded-full bg-[#ffb800] px-2 py-1 text-[9px] font-black uppercase text-[#1f0e07]">Live</span>}<span className={`mb-10 grid size-12 place-items-center rounded-2xl bg-${color === 'amber' ? '[#ffb800]' : color === 'orange' ? '[#ff5c00]' : '[#f4efe0]'} text-[#1f0e07]`}><Icon className="size-6" /></span><h3 className="font-display text-2xl font-black uppercase tracking-[-.04em]">{title}</h3><p className="mt-2 text-sm text-[#f4efe0]/50">{copy}</p><ArrowRight className="absolute bottom-6 right-6 size-5 text-[#ffb800] transition group-hover:translate-x-1" /></button>)}</div></div></section>

      <section id="listings" className="bg-[#f4efe0] px-5 py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[.22em] text-[#ff5c00]">Live near you</p>
              <h2 className="font-display text-5xl font-black uppercase leading-[.88] tracking-[-.06em] md:text-7xl">Food<br /><span className="text-[#ff5c00]">that&apos;s ready.</span></h2>
              <p className="mt-6 max-w-sm text-sm leading-6 text-[#1f0e07]/60">Every listing below is a real record pulled live from our AWS backend — nothing here is simulated.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl bg-[#ffb800] p-5"><Leaf className="mb-8 size-5" /><strong className="font-display text-4xl font-black">{totalMeals}</strong><span className="mt-1 block text-xs font-bold uppercase">reports logged</span></div>
              <div className="rounded-3xl border border-[#1f0e07]/15 p-5"><Recycle className="mb-8 size-5" /><strong className="font-display text-4xl font-black">{claimedCount}</strong><span className="mt-1 block text-xs font-bold uppercase">claimed</span></div>
              <div className="rounded-3xl bg-[#1f0e07] p-5 text-[#f4efe0]"><HeartHandshake className="mb-8 size-5 text-[#ffb800]" /><strong className="font-display text-4xl font-black">{Math.max(totalMeals - claimedCount, 0)}</strong><span className="mt-1 block text-xs font-bold uppercase text-[#f4efe0]/60">still pending</span></div>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-b border-[#1f0e07]/15 pb-4">
            <div className="flex gap-2">{['All', 'Pending', 'Claimed'].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-xs font-black uppercase ${filter === item ? 'bg-[#1f0e07] text-[#f4efe0]' : 'border border-[#1f0e07]/15'}`}>{item}</button>)}</div>
            <button onClick={loadReports} className="flex items-center gap-2 text-xs font-black uppercase text-[#1f0e07]/45 hover:text-[#ff5c00]">
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {loading && <p className="text-sm text-[#1f0e07]/50">Loading reports…</p>}
            {!loading && loadError && <p className="text-sm text-red-600">{loadError}</p>}
            {!loading && !loadError && visibleListings.length === 0 && (
              <p className="text-sm text-[#1f0e07]/50">No reports yet. Be the first to log surplus food!</p>
            )}
            {!loading && !loadError && visibleListings.map((item) => (
              <article key={item.id} className="group flex items-center gap-4 rounded-3xl border border-[#1f0e07]/12 bg-white/45 p-4 transition hover:bg-white">
                <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-[#eae3c9] text-4xl">{iconFor(item.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-xl font-black uppercase leading-none tracking-[-.03em]">{item.itemName}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.status === 'claimed' ? 'bg-[#1f0e07]/10' : 'bg-[#ffb800]'}`}>{item.status}</span>
                  </div>
                  <p className="mt-2 truncate text-xs text-[#1f0e07]/50"><MapPin className="mr-1 inline size-3" />{item.location}</p>
                  <div className="mt-3 flex items-center justify-between gap-4 text-xs font-bold">
                    <span>{item.quantity}</span>
                    {item.status === 'pending' ? (
                      <button onClick={() => handleClaim(item.id)} className="rounded-full bg-[#1f0e07] px-4 py-2 text-[10px] font-black uppercase text-[#f4efe0] transition hover:bg-[#ff5c00]">Claim</button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[#1f0e07]/45 text-[10px]">by {item.claimedBy || 'NGO'}</span>
                        <a href={`/track?id=${item.id}`} target="_blank" className="rounded-full bg-[#ff5c00] px-3 py-1 text-[10px] font-black uppercase text-white">
                          Track →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="impact" className="relative bg-[#ffb800] px-5 py-24 lg:px-10"><JaggedEdge flip /><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr]"><div><p className="mb-3 text-xs font-black uppercase tracking-[.22em]">Built for the Bharat Builds Tour</p><h2 className="font-display text-5xl font-black uppercase leading-[.88] tracking-[-.06em] md:text-7xl">Real backend.<br />Real data.<br /><span className="text-[#ff5c00]">Zero mockups.</span></h2></div><p className="max-w-md text-sm leading-6 text-[#1f0e07]/80">Every listing on this page is a live record from our AWS DynamoDB table, served through API Gateway and Lambda.</p></div></section>

      <footer className="bg-[#1f0e07] px-5 py-14 text-[#f4efe0] lg:px-10"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-8 border-b border-[#f4efe0]/15 pb-12 md:flex-row"><div><a href="#top" className="font-display text-4xl font-black tracking-[-.07em]">NOURISH<span className="text-[#ffb800]">.</span></a><p className="mt-4 max-w-xs text-sm leading-6 text-[#f4efe0]/50">Built on AWS Lambda, API Gateway &amp; DynamoDB — Team Pivot-Lab.</p><p className="mt-2 text-xs font-semibold text-[#f4efe0]/70">Suraj Maurya<br />Himanshu Yadav</p></div></div><div className="flex flex-col justify-between gap-3 pt-6 text-xs text-[#f4efe0]/40 sm:flex-row"><span>© 2026 Nourish / CivicLoop</span><span>Bharat Builds Tour 2026</span></div></div></footer>

      {modalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="donation-title" className="fixed inset-0 z-50 grid place-items-center bg-[#1f0e07]/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#f4efe0] p-6 shadow-2xl sm:p-9">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-[#ff5c00]">Quick donation</p>
                <h2 id="donation-title" className="font-display mt-2 text-4xl font-black uppercase leading-none tracking-[-.05em]">Log good food.</h2>
              </div>
              <button aria-label="Close donation dialog" onClick={() => setModalOpen(false)} className="rounded-full border border-[#1f0e07]/15 p-2"><X className="size-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={listening}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-4 text-sm font-black uppercase transition ${
                  listening ? 'border-[#ff5c00] bg-[#ff5c00]/10 text-[#ff5c00]' : 'border-[#1f0e07]/25 text-[#1f0e07]/70 hover:border-[#ff5c00] hover:text-[#ff5c00]'
                }`}
              >
                <Mic className={`size-5 ${listening ? 'animate-pulse' : ''}`} />
                {listening ? 'Listening…' : 'Speak your donation'}
              </button>
              {!voiceSupported && (
                <p className="text-center text-xs text-red-600">Voice input isn't supported in this browser. Try Chrome, or fill the form manually.</p>
              )}
              {voiceTranscript && (
                <p className="text-center text-xs text-[#1f0e07]/50 italic">"{voiceTranscript}"</p>
              )}
              <label className="grid gap-2 text-xs font-black uppercase">Type
                <select value={fType} onChange={(e) => setFType(e.target.value)} className="field">
                  <option value="donor">Restaurant / Donor</option>
                  <option value="citizen">Citizen report</option>
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase">Food item name
                <input required value={fItem} onChange={(e) => setFItem(e.target.value)} className="field" placeholder="e.g. Vegetable curry" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-black uppercase">Quantity
                  <input required type="number" min="1" value={fQty} onChange={(e) => setFQty(e.target.value)} className="field" placeholder="18" />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase">Unit
                  <select value={fUnit} onChange={(e) => setFUnit(e.target.value)} className="field">
                    <option>kg</option>
                    <option>servings</option>
                    <option>boxes</option>
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-xs font-black uppercase">Pickup location
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 size-4 -translate-y-1/2 opacity-50" />
                  <input required value={fLocation} onChange={(e) => setFLocation(e.target.value)} className="field pl-11" placeholder="Street, neighborhood, city" />
                </div>
              </label>
              <label className="grid cursor-pointer gap-2 text-xs font-black uppercase">Food photo (optional for now)
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[#1f0e07]/25 px-4 py-4 text-sm font-normal normal-case text-[#1f0e07]/50">
                  <Camera className="size-5" /> Add a photo <input type="file" accept="image/*" className="sr-only" />
                </div>
              </label>
              <button type="submit" disabled={submitting} className="mt-3 rounded-full bg-[#ff5c00] px-6 py-4 text-sm font-black uppercase text-white disabled:opacity-60">
                {submitting ? 'Publishing…' : 'Publish donation'} <CircleCheck className="ml-2 inline size-4" />
              </button>
              {formMsg && <p className="text-center text-xs font-bold">{formMsg}</p>}
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
