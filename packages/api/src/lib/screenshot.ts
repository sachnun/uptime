import puppeteer from '@cloudflare/puppeteer';

export async function captureScreenshot(browser: Fetcher, url: string): Promise<string | null> {
  try {
    const instance = await puppeteer.launch(browser);
    const page = await instance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const screenshot = await page.screenshot({ type: 'webp', quality: 80 });
    await instance.close();
    const bytes = new Uint8Array(screenshot);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/webp;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}
