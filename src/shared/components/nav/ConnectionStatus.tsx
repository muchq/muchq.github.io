import NavStatus, { NavStatusTone } from './NavStatus'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'failed'

interface ConnectionStatusProps {
  status: ConnectionState
  labels?: Partial<Record<ConnectionState, string>>
  onReconnect?: () => void
}

const DEFAULT_LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting...',
  connected: 'Connected',
  disconnected: 'Offline',
  failed: 'Unavailable',
}

const TONES: Record<ConnectionState, NavStatusTone> = {
  connecting: 'busy',
  connected: 'ok',
  disconnected: 'warn',
  failed: 'error',
}

const ConnectionStatus = ({ status, labels, onReconnect }: ConnectionStatusProps) => {
  const canReconnect = status === 'disconnected' || status === 'failed'

  return (
    <NavStatus
      tone={TONES[status]}
      label={labels?.[status] ?? DEFAULT_LABELS[status]}
      onAction={canReconnect ? onReconnect : undefined}
      actionTitle={status === 'failed' ? 'Try Reconnect' : 'Reconnect'}
    />
  )
}

export default ConnectionStatus
