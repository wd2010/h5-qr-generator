<script setup>
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const token = ref('')
const previewUrl = ref('') // data URL，供微信 imagePreview / 长按保存
const error = ref('')
const msg = ref('')
const generating = ref(false)
const inWeChat = ref(/MicroMessenger/i.test(navigator.userAgent))
const bridgeReady = ref(false)

// WeixinJSBridge 可能在页面加载后才注入，监听 WeixinJSBridgeReady
function markReady() {
  bridgeReady.value = true
}
onMounted(() => {
  if (typeof WeixinJSBridge !== 'undefined') {
    markReady()
  } else {
    document.addEventListener('WeixinJSBridgeReady', markReady, false)
  }
})

async function generate() {
  error.value = ''
  msg.value = ''
  const text = token.value.trim()
  if (!text) {
    error.value = '请输入要生成二维码的 token'
    return
  }
  generating.value = true
  try {
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, text, {
      width: 560,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a0d16', light: '#fcfcfd' }
    })
    // data URL：微信 imagePreview 需要真实可读的图片地址（data: 在现代微信可用）
    previewUrl.value = canvas.toDataURL('image/png')
  } catch (e) {
    error.value = '生成失败：' + (e?.message || e)
  } finally {
    generating.value = false
  }
}

// 方式一：WeixinJSBridge.invoke('imagePreview') 唤起微信原生大图查看器
// 查看器右上角「···」菜单含「保存到相册」——无需后端 JS-SDK 签名即可调用
function openNativeViewer() {
  if (typeof WeixinJSBridge === 'undefined') {
    msg.value = '当前不在微信环境，请长按二维码保存。'
    return
  }
  WeixinJSBridge.invoke(
    'imagePreview',
    {
      current: previewUrl.value,
      urls: [previewUrl.value]
    },
    (res) => {
      // res.err_msg 可能为 "imagePreview:ok" / "imagePreview:cancel"
      if (res && res.err_msg && res.err_msg.indexOf('fail') > -1) {
        msg.value = '唤起查看器失败，请改为长按二维码保存。'
      }
    }
  )
}

// 方式二：WeixinJSBridge.invoke('sendAppMessage') 分享给好友（好友会话内可长按保存）
function shareToFriend() {
  if (typeof WeixinJSBridge === 'undefined') {
    msg.value = '当前不在微信环境，无法使用分享。'
    return
  }
  WeixinJSBridge.invoke('sendAppMessage', {
    img_url: previewUrl.value,
    img_width: 560,
    img_height: 560,
    title: 'Token 二维码',
    desc: token.value.trim()
  })
}
</script>

<template>
  <div class="page">
    <main class="card">
      <p class="eyebrow">WEIXIN JSBridge</p>

      <h1 class="headline">
        微信<span class="brush">原生接口</span>存图
      </h1>
      <p class="sub">
        通过 WeixinJSBridge 唤起微信原生大图查看器，右上角「···」即可保存到相册。
      </p>

      <div v-if="inWeChat" class="env-tag wechat">已检测到微信环境</div>
      <div v-else class="env-tag plain">非微信环境（仅演示，请用微信打开）</div>

      <label class="field-label" for="btoken">Token</label>
      <input
        id="btoken"
        v-model="token"
        class="input"
        type="text"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        placeholder="在此粘贴或输入你的 token"
        @keyup.enter="generate"
      />

      <p v-if="error" class="error">{{ error }}</p>

      <button class="cta" :disabled="generating" @click="generate">
        {{ generating ? '生成中…' : '生成二维码' }}
      </button>

      <section v-if="previewUrl" class="preview">
        <p class="preview-title">预览</p>
        <img :src="previewUrl" alt="二维码预览" class="qr-img" />

        <div class="actions">
          <button class="act primary" :disabled="!bridgeReady" @click="openNativeViewer">
            微信原生查看器保存
          </button>
          <button class="act" :disabled="!bridgeReady" @click="shareToFriend">
            分享给好友
          </button>
        </div>

        <p v-if="!bridgeReady" class="hint">
          正在等待微信 JSBridge 注入…（请确认在微信内打开）
        </p>
        <p v-if="msg" class="hint">{{ msg }}</p>
        <p class="preview-hint">也可直接长按上方二维码 → 保存到相册</p>
      </section>

      <div class="note">
        <p class="note-title">说明</p>
        <p>
          <code>imagePreview</code> / <code>sendAppMessage</code> 是微信 WebView 内置桥，
          无需后端签名即可调用；如需 <code>chooseImage</code>、<code>uploadImage</code> 等高级能力，
          才需后端用公众号 appId 做 JS-SDK 签名（<code>wx.config</code>）。
        </p>
      </div>
    </main>

    <footer class="foot">
      <a class="back" href="./">← 返回主页面</a>
      <span class="sep">·</span>
      <span>Buddy · 工程草稿纸风格</span>
    </footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 20px
    calc(env(safe-area-inset-bottom, 0px) + 24px);
  gap: 16px;
}
.card {
  width: 100%;
  max-width: 440px;
  background: var(--color-paper-white);
  border: 1px solid var(--color-mist-gray);
  border-radius: var(--radius-cards);
  padding: 28px 24px;
  box-shadow: rgba(255, 255, 255, 0.72) 0 0 0 1px inset,
    rgb(213, 217, 232) 0 0 0 1px,
    rgba(29, 33, 48, 0.03) 0 1px 1px -1px,
    rgba(29, 33, 48, 0.05) 0 3px 3px -2px,
    rgba(29, 33, 48, 0.03) 0 5px 5px -3px,
    rgba(213, 217, 232, 0.22) 0 5px 5px -2px;
}
.eyebrow {
  margin: 0 0 14px;
  font-family: var(--font-ibm-plex-mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 2;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-pewter);
}
.headline {
  margin: 0 0 12px;
  font-size: clamp(28px, 8vw, 40px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -1px;
  color: var(--color-obsidian);
}
.brush {
  position: relative;
  display: inline-block;
}
.brush::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, #46d8ff, #19f79a, #e5ed38, #ff9dec);
}
.sub {
  margin: 0 0 20px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-pewter);
}
.env-tag {
  margin: 0 0 20px;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-family: var(--font-ibm-plex-mono);
  letter-spacing: 0.5px;
}
.env-tag.wechat {
  background: rgba(26, 173, 25, 0.1);
  color: #1aad19;
}
.env-tag.plain {
  background: rgba(29, 33, 48, 0.05);
  color: var(--color-graphite);
}
.field-label {
  display: block;
  margin: 0 0 8px;
  font-family: var(--font-ibm-plex-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-graphite);
}
.input {
  width: 100%;
  padding: 16px 18px;
  font-family: var(--font-ibm-plex-sans);
  font-size: 16px;
  color: var(--color-carbon);
  background: #ffffff;
  border: 1px solid var(--color-slate-edge);
  border-radius: var(--radius-field);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.input::placeholder {
  color: var(--color-silver-wash);
}
.input:focus {
  border-color: var(--color-cobalt-signal);
  box-shadow: 0 0 0 3px rgba(26, 103, 253, 0.12);
}
.error {
  margin: 12px 0 0;
  font-size: 14px;
  color: #c0392b;
}
.cta {
  width: 100%;
  margin-top: 16px;
  padding: 16px 32px;
  font-family: var(--font-ibm-plex-sans);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-obsidian);
  background: var(--color-lime-spark);
  border: none;
  border-radius: var(--radius-buttons);
  cursor: pointer;
  box-shadow: rgba(255, 255, 255, 0.72) 0 1px 0 0 inset,
    rgba(29, 33, 48, 0.12) 0 -2px 0 0 inset,
    rgba(29, 33, 48, 0.04) 0 1px 1px -1px,
    rgba(29, 33, 48, 0.04) 0 4px 4px -2px;
  transition: transform 0.08s ease, filter 0.15s ease;
}
.cta:active {
  transform: translateY(1px);
  filter: brightness(0.97);
}
.cta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.preview {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--color-mist-gray);
  text-align: center;
}
.preview-title {
  margin: 0 0 14px;
  font-family: var(--font-ibm-plex-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--color-pewter);
}
.qr-img {
  width: 220px;
  height: 220px;
  max-width: 100%;
  border-radius: var(--radius-images);
  border: 1px solid var(--color-mist-gray);
  background: #fff;
  display: block;
  margin: 0 auto;
}
.actions {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.act {
  width: 100%;
  padding: 14px 24px;
  font-family: var(--font-ibm-plex-sans);
  font-size: 15px;
  font-weight: 600;
  color: var(--color-obsidian);
  background: #ffffff;
  border: 1px solid var(--color-slate-edge);
  border-radius: var(--radius-buttons);
  cursor: pointer;
  transition: transform 0.08s ease, filter 0.15s ease;
}
.act.primary {
  color: #fff;
  background: #07c160;
  border-color: #07c160;
  box-shadow: rgba(255, 255, 255, 0.72) 0 1px 0 0 inset,
    rgba(29, 33, 48, 0.12) 0 -2px 0 0 inset;
}
.act:active {
  transform: translateY(1px);
  filter: brightness(0.97);
}
.act:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-cobalt-signal);
}
.preview-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--color-graphite);
}
.note {
  margin-top: 22px;
  padding: 14px 16px;
  border-radius: var(--radius-images);
  background: rgba(29, 33, 48, 0.04);
}
.note-title {
  margin: 0 0 8px;
  font-family: var(--font-ibm-plex-mono);
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-pewter);
}
.note p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-carbon);
}
.note code {
  font-family: var(--font-ibm-plex-mono);
  font-size: 12px;
  background: rgba(26, 103, 253, 0.1);
  color: var(--color-cobalt-signal);
  padding: 1px 5px;
  border-radius: 4px;
}
.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-ibm-plex-mono);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-silver-wash);
}
.foot .back {
  color: var(--color-cobalt-signal);
  text-decoration: none;
  text-transform: none;
  letter-spacing: 0;
}
.foot .sep {
  color: var(--color-silver-wash);
}
</style>
