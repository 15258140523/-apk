<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useSessionStore } from './stores/session'

onLaunch(async () => {
  // #ifdef MP-WEIXIN
  await uniCloud.initSecureNetworkByWeixin({
    callLoginByWeixin: true,
  })
  // #endif
  await useSessionStore().bootstrap()
})
</script>

<style>
page {
  background: #f6f7fb;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
</style>
