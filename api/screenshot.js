const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

module.exports = async function(req, res) {
    const { post_id, template = 1 } = req.query;

    if (!post_id) {
        return res.status(400).json({ error: 'পোস্ট আইডি (post_id) দেওয়া হয়নি!' });
    }

    const targetUrl = `https://networknewsbd.com/?nnews_automation_card=1&automation_post_id=${post_id}&automation_template=${template}`;

    let browser = null;
    try {
        // Vercel-এর Missing Library বাইপাস করার জন্য Remote Chromium Pack
        browser = await puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(
                'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
            ),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // এক্সিস্টিং ৩৬০x৩৬০ ডিজাইনটিকে ৪গুণ স্কেল করা হচ্ছে ১৪৪০x১৪৪০ আউটপুটের জন্য
        await page.setViewport({
            width: 360,
            height: 360,
            deviceScaleFactor: 4,
        });

        // পেজ লোড করা এবং নেটওয়ার্ক রিকোয়েস্ট শেষ হওয়া পর্যন্ত অপেক্ষা করা
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });

        // কাস্টম ফন্ট এবং ছবি পুরোপুরি লোড হওয়ার জন্য অতিরিক্ত অপেক্ষা
        await page.evaluateHandle('document.fonts.ready');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // রেন্ডার কন্টেইনার সিলেক্ট করা
        const element = await page.$('#render-container');
        if (!element) {
            throw new Error('কার্ডের ডিজাইন খুঁজে পাওয়া যায়নি।');
        }

        // ছবি তোলা (High Quality JPG)
        const screenshot = await element.screenshot({
            type: 'jpeg',
            quality: 95
        });

        // ব্রাউজারে বা API-তে সরাসরি ছবি দেখানোর জন্য হেডার সেট করা
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
}
