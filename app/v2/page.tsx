import { DevPreviewBridge } from '@/components/dev-preview-bridge'
import { LauncherShell } from '@/components/launcher-shell'

/**
 * Direct link to the shell for side-by-side comparison. It renders whichever
 * direction Settings currently selects, same as the root route — the switch
 * lives in Settings now, not in the URL.
 */
export default function V2Page() {
  return (
    <DevPreviewBridge>
      <LauncherShell />
    </DevPreviewBridge>
  )
}
