import { Router } from 'express';
import { getAll, update } from '../controllers/settingsController';
import {
  getEmailSettings,
  saveEmailSettings,
  testEmailSettings,
  getWhatsAppSettings,
  saveWhatsAppSettings,
  getWhatsAppUsage,
  testWhatsAppSettings,
  getNotificationRules,
  updateNotificationRules,
} from '../controllers/notificationSettingsController';

const router = Router();

router.get('/email', getEmailSettings);
router.post('/email', saveEmailSettings);
router.put('/email', saveEmailSettings);
router.post('/email/test', testEmailSettings);

router.get('/whatsapp', getWhatsAppSettings);
router.post('/whatsapp', saveWhatsAppSettings);
router.put('/whatsapp', saveWhatsAppSettings);
router.get('/whatsapp/usage', getWhatsAppUsage);
router.post('/whatsapp/test', testWhatsAppSettings);

router.get('/notification-rules', getNotificationRules);
router.put('/notification-rules', updateNotificationRules);

router.get('/', getAll);
router.put('/', update);

export default router;
