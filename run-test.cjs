const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Expose function to capture data URL from page
  await page.exposeFunction('onDataUrl', (dataUrl) => {
    const fs = require('fs');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync("test-output.png", base64Data, 'base64');
    console.log("Saved test-output.png");
  });

  await page.goto(`file://${__dirname}/test-ticket.html`, { waitUntil: 'networkidle0' });

  // Wait a moment for html2canvas to finish and call our exposed function
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000); // Give html2canvas time
    const link = document.getElementById('download-link');
    if (link) {
      window.onDataUrl(link.href);
    }
  });

  await browser.close();
})();
