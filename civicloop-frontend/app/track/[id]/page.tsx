'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API_BASE = 'https://5icz9ihs21.execute-api.ap-south-1.amazonaws.com/Prod'

export default function TrackPage() {
  const params = useParams()
  const id = params.id as string
  const [reportInfo, setReportInfo] = useState<any>(null)
  const [status, setStatus] = useState('Waiting for volunteer location…')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/reports`)
        const data = await res.json()
        const report = (data.reports || []).find((r: any) => r.id === id)
        if (!report) return
        setReportInfo(report)

        if (report.lat && report.lng) {
          setCoords({ lat: parseFloat(report.lat), lng: parseFloat(report.lng) })
          setStatus('🟢 Live — volunteer is on the way')
          setLastUpdated(new Date().toLocaleTimeString())
        }
      } catch (err) {
        console.error(err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [id])

  const pad = 0.006
  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - pad}%2C${coords.lat - pad}%2C${coords.lng + pad}%2C${coords.lat + pad}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`
    : null

  return (
    <main className="min-h-screen bg-[#f4efe0] text-[#1f0e07] p-6">
      <h1 className="text-3xl font-black uppercase mb-2">Tracking pickup</h1>
      <p className="text-sm text-[#1f0e07]/60 mb-4">
        {reportInfo ? `${reportInfo.itemName} · Claimed by ${reportInfo.claimedBy}` : 'Loading report…'}
      </p>
      <p className="text-sm font-bold mb-1">{status}</p>
      {lastUpdated && <p className="text-xs text-[#1f0e07]/40 mb-4">Last updated: {lastUpdated}</p>}

      {mapSrc ? (
        <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(31,14,7,0.15)' }}>
          <iframe
            key={mapSrc}
            title="Live location map"
            src={mapSrc}
            style={{ width: '100%', height: '420px', border: 0 }}
          />
        </div>
      ) : (
        <div className="h-[420px] rounded-3xl bg-[#eae3c9] grid place-items-center text-sm text-[#1f0e07]/50">
          Ask the volunteer to open their share link and allow location access…
        </div>
      )}

      {coords && (
        <p className="mt-3 text-xs text-[#1f0e07]/40">
          Coordinates: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
    </main>
  )
}