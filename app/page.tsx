import { DevPreviewBridge } from '@/components/dev-preview-bridge'
import { Launcher } from '@/components/launcher'

export default function Page() {
  return (
    <DevPreviewBridge>
      <Launcher />
    </DevPreviewBridge>
  )
}
