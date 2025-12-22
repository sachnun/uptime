import puppeteer from '@cloudflare/puppeteer';

async function uploadToImgbb(imageBuffer: Buffer | ArrayBuffer, apiKey: string): Promise<string | null> {
  const bytes = new Uint8Array(imageBuffer as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const formData = new FormData();
  formData.append('image', base64);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { success: boolean; data?: { url: string } };
  return data.success ? data.data?.url ?? null : null;
}

export async function captureScreenshot(
  browser: Fetcher,
  url: string,
  imgbbApiKey?: string
): Promise<string | null> {
  if (!imgbbApiKey) return null;

  try {
    const instance = await puppeteer.launch(browser);
    const page = await instance.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    const screenshot = await page.screenshot({ type: 'webp', quality: 80 });
    await instance.close();

    return await uploadToImgbb(screenshot, imgbbApiKey);
  } catch {
    return null;
  }
}
