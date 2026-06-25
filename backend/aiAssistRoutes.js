const express = require('express');
const axios = require('axios');

function readGeminiText(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
  const parts = candidates
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text)
    .filter((text) => typeof text === 'string' && text.trim());

  return parts.join('\n').trim();
}

function buildSystemPrompt(req, userMessage) {
  const moduleName = String(req.body?.module || req.body?.currentModule || req.body?.page || 'EMA System').trim();

  return [
    'You are EMA System AI Assistant for an IT Operations platform.',
    'Answer using concise, practical operational guidance.',
    'The user may ask about endpoint inventory, software, network, patch, task list, service desk, reporting, settings, risk or compliance.',
    'Do not claim access to live database records unless the request payload includes those records.',
    `Current module/page: ${moduleName}.`,
    '',
    `User question: ${userMessage}`
  ].join('\n');
}

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GENAI_API_KEY ||
    ''
  ).trim();
}

function getGeminiModel() {
  return (process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash').trim();
}

function registerAiAssistRoutes(app, options = {}) {
  const authenticateToken = typeof options.authenticateToken === 'function'
    ? options.authenticateToken
    : (_req, _res, next) => next();

  const jsonParser = express.json({ limit: '1mb' });

  app.post('/api/ai-assist', jsonParser, authenticateToken, async (req, res) => {
    const message = String(req.body?.message || req.body?.prompt || req.body?.question || '').trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'AI prompt is required.'
      });
    }

    const apiKey = getGeminiApiKey();
    const model = getGeminiModel();

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'Gemini API key is not configured. Add GEMINI_API_KEY in backend/.env and restart backend.',
        code: 'GEMINI_API_KEY_MISSING'
      });
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const geminiResponse = await axios.post(
        endpoint,
        {
          contents: [
            {
              role: 'user',
              parts: [{ text: buildSystemPrompt(req, message) }]
            }
          ],
          generationConfig: {
            temperature: Number(process.env.GEMINI_TEMPERATURE || 0.2),
            maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS || 1200)
          }
        },
        {
          params: { key: apiKey },
          timeout: Number(process.env.GEMINI_TIMEOUT_MS || 30000)
        }
      );

      const answer = readGeminiText(geminiResponse.data);

      if (!answer) {
        return res.status(502).json({
          success: false,
          message: 'Gemini returned an empty response.',
          code: 'GEMINI_EMPTY_RESPONSE'
        });
      }

      return res.json({
        success: true,
        provider: 'gemini',
        model,
        answer,
        data: { answer }
      });
    } catch (error) {
      const status = error?.response?.status || 502;
      const geminiMessage =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Gemini request failed.';

      console.error('[AI Assist] Gemini request failed:', geminiMessage);

      return res.status(status >= 400 && status < 600 ? status : 502).json({
        success: false,
        message: `Gemini request failed: ${geminiMessage}`,
        code: 'GEMINI_REQUEST_FAILED'
      });
    }
  });

  app.post('/api/ai/assist', jsonParser, authenticateToken, (req, res, next) => {
    req.url = '/api/ai-assist';
    return app._router.handle(req, res, next);
  });

  app.post('/api/assistant/chat', jsonParser, authenticateToken, (req, res, next) => {
    req.url = '/api/ai-assist';
    return app._router.handle(req, res, next);
  });
}

module.exports = registerAiAssistRoutes;
