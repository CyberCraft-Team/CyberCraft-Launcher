import { DevPreviewBridge } from '@/components/dev-preview-bridge'
import { LauncherShell } from '@/components/launcher-shell'

export default function Page() {
  return (
    <DevPreviewBridge>
      <LauncherShell />
    </DevPreviewBridge>
  )
}
