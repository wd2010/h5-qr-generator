<script setup>
import { ref } from 'vue'
import QRCode from 'qrcode'

const token = ref('')
const previewUrl = ref('')
const error = ref('')
const saving = ref(false)
const longPressHint = ref(false)

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function generateAndSave() {
  error.value = ''
  longPressHint.value = false
  const text = token.value.trim()
  if (!text) {
    error.value = '请输入要生成二维码的 token'
    return
  }

  saving.value = true
  try {
    // 1) 生成高清二维码到离屏 canvas
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, text, {
      width: 560,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0a0d16', // Obsidian
        light: '#fcfcfd' // Paper White
      }
    })

    // 2) 导出为 PNG blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    )
    if (!blob) throw new Error('二维码生成失败')

    previewUrl.value = URL.createObjectURL(blob)

    // 3) 保存到相册
    await saveToAlbum(blob)
  } catch (e) {
    error.value = '生成失败：' + (e?.message || e)
  } finally {
    saving.value = false
  }
}

async function saveToAlbum(blob) {
  const file = new File([blob], 'token-qrcode.png', { type: 'image/png' })

  // 优先：系统分享面板（iOS 15+ / Android Chrome 可在面板里选“存储到照片/相册”）
  // if (navigator.canShare && navigator.canShare({ files: [file] })) {
  //   try {
  //     await navigator.share({
  //       files: [file],
  //       title: '二维码',
  //       text: 'Token 二维码'
  //     })
  //     return
  //   } catch (e) {
  //     // 用户取消或不支持，继续走下载兜底
  //   }
  // }

  // 兜底：触发下载（Android / 桌面有效）
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'token-qrcode.png'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  // iOS Safari 不支持 <a download> 直接存图，提示长按保存
  if (isIOS()) {
    longPressHint.value = true
  }
}
</script>

<template>
  <div class="page">
    <main class="card">
      <p class="eyebrow">QR GENERATOR</p>

      <h1 class="headline">
        把 Token 变成<span class="brush">二维码</span>
      </h1>
      <p class="sub">输入任意 token，一键生成可扫码的二维码并保存到相册。</p>

      <label class="field-label" for="token">Token</label>
      <input
        id="token"
        v-model="token"
        class="input"
        type="text"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        placeholder="在此粘贴或输入你的 token"
        @keyup.enter="generateAndSave"
      />

      <p v-if="error" class="error">{{ error }}</p>

      <button class="cta" :disabled="saving" @click="generateAndSave">
        {{ saving ? '生成中…' : '生成并保存到相册' }}
      </button>

      <section v-if="previewUrl" class="preview">
        <p class="preview-title">预览</p>
        <img :src="previewUrl" alt="二维码预览" class="qr-img" />
        <p class="preview-hint">长按上方二维码可存储到照片</p>
        <p v-if="longPressHint" class="hint">
          iOS 不支持直接下载，请<span class="hl">长按二维码 → 选择“存储到照片”</span>。
        </p>
      </section>
    </main>

    <footer class="foot">Buddy · 工程草稿纸风格</footer>
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
  margin: 0 0 24px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--color-pewter);
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
.preview-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--color-graphite);
}
.hint {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-carbon);
}
.hl {
  color: var(--color-cobalt-signal);
  font-weight: 600;
}

.foot {
  font-family: var(--font-ibm-plex-mono);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-silver-wash);
}
</style>
