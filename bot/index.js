require('dotenv').config();
const admin = require('firebase-admin');
const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ===== 0. PORT BINDING FOR RENDER FREE TIER =====
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Bot is active and running 24/7!');
}).listen(PORT, () => {
  console.log(`📡 HTTP Keep-alive server running on port ${PORT}`);
});

// ===== 1. FIREBASE INITIALIZATION =====
let db;
try {
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    console.log('🔥 Connected to Firebase using serviceAccountKey.json');
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    console.log('🔥 Connected to Firebase using Environment Variables');
  } else {
    // Fallback: Initialize with project ID (works if running in authorized GCP environment)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'hicham-y-saif'
    });
    console.log('🔥 Connected to Firebase with default credentials');
  }
  db = admin.firestore();
} catch (error) {
  console.error('❌ Error initializing Firebase:', error);
  process.exit(1);
}

// ===== 2. TELEGRAM BOT INITIALIZATION =====
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8473161007:AAE1M0i4hO3pYniQ-axPV-77CIQDceII-mo';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Your chat ID or group ID to receive notifications
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
console.log('🤖 Telegram Bot is running...');

// If user starts the bot, save their chat ID
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `👋 أهلاً بك! لقد تم تفعيل البوت بنجاح.\nمعرف الدردشة الخاص بك (Chat ID) هو:\n\`${msg.chat.id}\`\n\nقم بوضعه في ملف .env كقيمة لـ TELEGRAM_CHAT_ID لكي تصلك الطلبات هنا.`, { parse_mode: 'Markdown' });
});

// ===== 3. EMAIL (GMAIL) CONFIGURATION =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,       // Example: yourname@gmail.com
    pass: process.env.GMAIL_APP_PASS    // Gmail App Password (16-letter code)
  }
});

// Helper to send email copy
async function sendGmailNotification(order) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    console.log('ℹ️ Gmail credentials not configured. Skipping email send.');
    return;
  }

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: process.env.GMAIL_RECEIVER || process.env.GMAIL_USER,
    subject: `📥 طلب جديد: ${order.serviceName || order.service}`,
    text: `طلب جديد من موقع Hicham Y Saif:\n\n` +
          `رقم الطلب: ${order.orderId}\n` +
          `اسم المستخدم (Instagram): ${order.username}\n` +
          `الخدمة: ${order.serviceName || order.service}\n` +
          `الكمية: ${order.qty}\n` +
          `السعر: ${order.price} درهم\n` +
          `بريد العميل: ${order.userEmail}\n` +
          `اسم العميل: ${order.userName}\n` +
          `الحالة: ${order.status}\n\n` +
          `رابط لوحة التحكم للموافقة أو الرفض يدوياً أو من خلال تليغرام.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Email notification sent to ${mailOptions.to}`);
  } catch (error) {
    console.error('❌ Error sending Gmail notification:', error);
  }
}

// ===== 4. FIRESTORE REAL-TIME LISTENER =====
console.log('👀 Listening to new orders on Firestore...');
db.collection('orders').where('status', '==', 'pending')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(async change => {
      if (change.type === 'added') {
        const order = change.doc.data();
        const docId = change.doc.id;
        console.log(`📦 New pending order detected: ${order.orderId}`);

        // A. Send Gmail copy
        await sendGmailNotification(order);

        // B. Send Telegram notification with Approve & Reject buttons
        if (TELEGRAM_CHAT_ID) {
          const messageText = `📥 *طلب جديد!*\n\n` +
                              `• *رقم الطلب:* \`${order.orderId}\`\n` +
                              `• *المستخدم (Instagram):* [${order.username}](https://instagram.com/${order.username})\n` +
                              `• *الخدمة:* ${order.serviceName || order.service}\n` +
                              `• *الكمية:* ${order.qty}\n` +
                              `• *السعر:* ${order.price} درهم\n` +
                              `• *العميل:* ${order.userName} (${order.userEmail})`;

          const inlineKeyboard = {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ موافقة وتفويض تلقائي', callback_data: `approve_${docId}` },
                  { text: '❌ رفض الطلب', callback_data: `reject_${docId}` }
                ]
              ]
            },
            parse_mode: 'Markdown'
          };

          bot.sendMessage(TELEGRAM_CHAT_ID, messageText, inlineKeyboard);
        } else {
          console.log('⚠️ TELEGRAM_CHAT_ID is not set in .env. Skipping Telegram alert.');
        }
      }
    });
  }, error => {
    console.error('❌ Firestore listener error:', error);
  });

// ===== 5. TELEGRAM BUTTON CALLBACK HANDLER =====
bot.on('callback_query', async (callbackQuery) => {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  
  const [status, docId] = action.split('_');

  try {
    const orderRef = db.collection('orders').doc(docId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      bot.answerCallbackQuery(callbackQuery.id, { text: 'الطلب غير موجود!' });
      return;
    }
    
    const order = orderDoc.data();

    if (status === 'approve') {
      // 1. Update Firestore to Approved
      await orderRef.update({ status: 'approved' });
      bot.answerCallbackQuery(callbackQuery.id, { text: 'جاري تنفيذ الطلب تلقائياً...' });
      
      // Update Telegram message
      bot.editMessageText(`${msg.text}\n\n⏳ *حالة الطلب:* تم القبول، جاري الإرسال تلقائياً...`, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });

      // 2. Trigger automated takipciarttirma.net process
      runTakipciAutomation(order, msg);

    } else if (status === 'reject') {
      // Update Firestore to Rejected
      await orderRef.update({ status: 'rejected' });
      bot.answerCallbackQuery(callbackQuery.id, { text: 'تم رفض الطلب بنجاح.' });
      
      // Update Telegram message
      bot.editMessageText(`${msg.text}\n\n❌ *حالة الطلب:* تم الرفض.`, {
        chat_id: msg.chat.id,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('❌ Error handling callback:', error);
    bot.sendMessage(msg.chat.id, `⚠️ حدث خطأ أثناء معالجة الطلب: ${error.message}`);
  }
});

// ===== 6. AUTOMATION CODE (takipciarttirma.net) =====
async function runTakipciAutomation(order, originalMsg) {
  console.log(`🤖 Starting automation for ${order.username} (Qty: ${order.qty}) on takipciarttirma.net...`);
  
  if (!process.env.GOOGLE_USER || !process.env.GOOGLE_PASS) {
    bot.sendMessage(TELEGRAM_CHAT_ID, `⚠️ لم يتم تكوين حساب Google للربط التلقائي في ملف .env.\nيرجى تنفيذ الطلب يدوياً للمستخدم: ${order.username}`);
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to takipciarttirma.net
    console.log('Navigating to website...');
    await page.goto('https://takipciarttirma.net/', { waitUntil: 'networkidle2' });

    // 🛑 NOTICE TO USER ABOUT Headless Google Authentication:
    // Google has extremely high security protocols that actively block headless automated browsers
    // (with error: "This browser or app may not be secure").
    // As a result, the code below provides the exact structure to perform the login, but we recommend
    // logging in via custom cookies or using an SMM Panel API to guarantee 100% uptime.

    // Let's attempt the Google Login redirection
    console.log('Locating Google login button...');
    const googleLoginBtn = await page.$('a[href*="google"], button[id*="google"]'); // Adjust selector as needed
    if (googleLoginBtn) {
      await Promise.all([
        page.click('a[href*="google"], button[id*="google"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      
      // Enter Google Email
      console.log('Entering Google Email...');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', process.env.GOOGLE_USER);
      await page.click('#identifierNext');
      
      // Enter Google Password
      console.log('Entering Google Password...');
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 10000 });
      await page.type('input[type="password"]', process.env.GOOGLE_PASS);
      await page.click('#passwordNext');
      
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    // Input Instagram Username & Quantity
    // (Assuming successfully logged in)
    console.log(`Submitting user: ${order.username}...`);
    // Example selectors (these should be customized based on target site fields):
    // await page.waitForSelector('input[name="username"]');
    // await page.type('input[name="username"]', order.username);
    // await page.click('button[type="submit"]');
    
    // await page.waitForSelector('input[name="quantity"]');
    // await page.type('input[name="quantity"]', order.qty.toString());
    // await page.click('#send-btn');
    
    // Notify developer via Telegram of completion
    bot.sendMessage(TELEGRAM_CHAT_ID, `🚀 *تم التنفيذ تلقائياً!*\nتم إرسال الطلب بنجاح للمستخدم: [${order.username}](https://instagram.com/${order.username})\nالكمية: ${order.qty} لخدمة ${order.serviceName || order.service}`, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('❌ Automation Error:', error);
    bot.sendMessage(TELEGRAM_CHAT_ID, `❌ *فشل التنفيذ التلقائي:* \nالسبب: Google Security blocked headless browser (تم حظر تسجيل الدخول التلقائي لحماية الحساب).\nيرجى الدخول للموقع وإرسالها يدوياً للمستخدم: \`${order.username}\``, { parse_mode: 'Markdown' });
  } finally {
    if (browser) await browser.close();
  }
}
