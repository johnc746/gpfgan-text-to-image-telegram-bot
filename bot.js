import { createRequire } from "module";
import axios from "axios";
const require = createRequire(import.meta.url);
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv");

dotenv.config();
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

async function generateImage(prompt) {
  return await openai.createImage({
    prompt: prompt,
    model: "image-alpha-001",
    n: 1,
    size: "1024x1024",
  });
}

async function createPrediction(text) {
  const response = await axios.post(
    "https://api.replicate.com/v1/predictions",
    {
      // Pinned to a specific version of Stable Diffusion
      // See https://replicate.com/stability-ai/stable-diffussion/versions
      version:
        "6359a0cab3ca6e4d3320c33d79096161208e9024d174b2311e5a21b6c7e1131c",

      // This is the text prompt that will be submitted by a form on the frontend
      input: { prompt: text },
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const prediction = response.data;
  return prediction;
}

async function getPredictionStatus(id) {
  const response = await axios.get(
    "https://api.replicate.com/v1/predictions/" + id,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    }
  );
  // if (response.status !== 200) {
  //   let error = await response.json();
  //   res.statusCode = 500;
  //   res.end(JSON.stringify({ detail: error.detail }));
  //   return;
  // }

  const prediction = response.data;
  // console.log(response);
  return prediction;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Matches "/echo [whatever]"
bot.onText(/\/image (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Your image is being generated. Please wait.");
  // const image = await generateImage(match[1]);
  const prediction = await createPrediction(match[1]);

  let response = null;

  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await sleep(1000);
    response = await getPredictionStatus(prediction.id);
    if (response.err || response.output) {
      break;
    }
  }

  if (response.output) {
    bot.sendPhoto(chatId, response.output[response.output.length - 1], {
      caption: match[1],
    });
  }
  else {
    bot.sendMessage(chatId, "Sorry. There was an error.");
  }
});

bot.startPolling();
