import Peer, { type DataConnection } from 'peerjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ROOM_PREFIX, type NetMessage } from '../state/online'

export type RoomStatus = 'connecting' | 'waiting' | 'connected' | 'closed' | 'error'

const PING_MS = 2000
const DEAD_AFTER_MS = 7000
const PING = { type: 'ping' } as const
type Wire = NetMessage | typeof PING

export interface Room {
  status: RoomStatus
  error: string | null
  send: (msg: NetMessage) => void
}

/**
 * One WebRTC data channel between host and guest via PeerJS (its public server only
 * brokers the handshake; game traffic is peer-to-peer). The host claims the peer id
 * derived from the room code; the guest dials it.
 */
export function useRoom(role: 'host' | 'guest', code: string, onMessage: (msg: NetMessage) => void): Room {
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const connRef = useRef<DataConnection | null>(null)
  const onMessageRef = useRef(onMessage)
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    const peer = role === 'host' ? new Peer(ROOM_PREFIX + code) : new Peer()
    let cancelled = false

    let pingTimer = 0
    let deadTimer = 0
    const stopTimers = () => {
      window.clearInterval(pingTimer)
      window.clearTimeout(deadTimer)
    }
    const closed = () => {
      stopTimers()
      if (!cancelled) setStatus('closed')
    }
    // Browsers can take a long time (or never) to report a closed data channel when the
    // other tab is simply shut, so both sides heartbeat and declare the peer gone on silence.
    const armDeadTimer = () => {
      window.clearTimeout(deadTimer)
      deadTimer = window.setTimeout(closed, DEAD_AFTER_MS)
    }

    const attach = (conn: DataConnection) => {
      connRef.current = conn
      conn.on('open', () => {
        if (cancelled) return
        setStatus('connected')
        pingTimer = window.setInterval(() => conn.open && conn.send(PING), PING_MS)
        armDeadTimer()
      })
      conn.on('data', (data) => {
        if (cancelled) return
        armDeadTimer()
        const msg = data as Wire
        if (msg.type !== 'ping') onMessageRef.current(msg)
      })
      conn.on('close', closed)
      conn.on('iceStateChanged', (s) => {
        if (s === 'disconnected' || s === 'failed' || s === 'closed') closed()
      })
      conn.on('error', (e) => {
        if (cancelled) return
        setError(e.message)
        setStatus('error')
      })
    }

    peer.on('open', () => {
      if (cancelled) return
      if (role === 'host') setStatus('waiting')
      else attach(peer.connect(ROOM_PREFIX + code, { reliable: true }))
    })
    peer.on('connection', (conn) => {
      if (cancelled) return
      if (connRef.current) {
        conn.close()
        return
      }
      attach(conn)
    })
    peer.on('error', (e) => {
      if (cancelled) return
      const type = String(e.type)
      setError(
        type === 'unavailable-id'
          ? 'That room is already open in another tab.'
          : type === 'peer-unavailable'
            ? 'No one is hosting that room. Check the link, or ask your friend to reopen it.'
            : e.message,
      )
      setStatus('error')
    })
    peer.on('disconnected', () => {
      if (!cancelled && !peer.destroyed) peer.reconnect()
    })

    return () => {
      cancelled = true
      stopTimers()
      connRef.current = null
      peer.destroy()
    }
  }, [role, code])

  const send = useCallback((msg: NetMessage) => {
    const conn = connRef.current
    if (conn?.open) conn.send(msg)
  }, [])

  return { status, error, send }
}
