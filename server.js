const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/screenshot', async (req, res) => {
    const { post_id, template = 1 } = req.query;

    if (!post_id) {
        return res.status(400).json({ error: 'পোস্ট আইডি (post_id) দেওয়া হয়নি!' });
    }

    const targetUrl = `https://networknewsbd.com/?nnews_automation_card=1&automation_post_id=${post_id}&automation_template=${template}`;
    let browser = null;

    try {
        browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--hide-scrollbars',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();
        
        await page.setViewport({ width: 360, height: 360, deviceScaleFactor: 4 });
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });

        await page.evaluateHandle('document.fonts.ready');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const element = await page.$('#render-container');
        if (!element) {
            throw new Error('কার্ডের ডিজাইন খুঁজে পাওয়া যায়নি।');
        }

        const screenshot = await element.screenshot({ type: 'jpeg', quality: 95 });

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.status(200).send(screenshot);
        
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'ছবি তৈরি করতে সমস্যা হয়েছে', details: error.message });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
