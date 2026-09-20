'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const API_BASE = 'https://5icz9ihs21.execute-api.ap-south-1.amazonaws.com/Prod'

function ShareContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || ''
  const [status, setStatus] = useState('Starting…')
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    if (!id) {
      setStatus('❌ No report ID provided in the link.')
      return
    }
    if (!navigator.geolocation) {
      setStatus('❌ Geolocation not supported on this device/browser.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLastCoords({ lat, lng })
        setStatus('📡 Sharing your live location…')

        try {
          await fetch(`${API_BASE}/reports/${id}/location`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng, timestamp: new Date().toISOString() }),
          })
          setUpdateCount((c) => c + 1)
        } catch (err) {
          console.error(err)
          setStatus('⚠️ Location captured but failed to send. Retrying…')
        }
      },
      (err) => {
        console.error(err)
        setStatus('❌ Location permission denied. Please allow location access.')
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [id])

  return (
    <main className="min-h-screen bg-[#1f0e07] text-[#f4efe0] flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-black uppercase mb-4">Sharing pickup location</h1>
      <p className="text-sm text-[#f4efe0]/60 mb-8">Report ID: {id || '(missing)'}</p>
      <div className="rounded-3xl bg-[#2a150d] p-8 max-w-md w-full">
        <p className="text-lg font-bold mb-4">{status}</p>
        {lastCoords && (
          <p className="text-xs text-[#f4efe0]/50">
            Last sent: {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)}
          </p>
        )}
        <p className="mt-4 text-xs text-[#ffb800]">Updates sent: {updateCount}</p>
      </div>
      <p className="mt-8 text-xs text-[#f4efe0]/40 max-w-sm">
        Keep this tab open while you're on your way to pick up the food. Don't close it — the donor is tracking your location live.
      </p>
    </main>
  )
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1f0e07]" />}>
      <ShareContent />
    </Suspense>
  )
}