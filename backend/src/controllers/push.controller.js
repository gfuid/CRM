/** Turn phone / desktop notifications on or off for the logged-in person (see services/push.service.js). */
const ApiResponse = require('../utils/apiResponse');
const push = require('../services/push.service');

/** The public key the browser needs, and how many devices this person has switched on. */
const getStatus = async (req, res) => {
  const { publicKey } = push.getKeys();
  return ApiResponse.success(res, { public_key: publicKey, devices: push.devicesOf(req.user.id).length }, 'Push status');
};

const subscribe = async (req, res) => {
  const count = push.addDevice(req.user.id, req.body && req.body.subscription, req.body && req.body.label);
  if (!count) return ApiResponse.error(res, 'This browser sent an invalid subscription. Please try again.', 400);
  return ApiResponse.success(res, { devices: count }, 'Notifications are on for this device');
};

const unsubscribe = async (req, res) => {
  const endpoint = String((req.body && req.body.endpoint) || '');
  const count = push.removeDevice(req.user.id, endpoint);
  return ApiResponse.success(res, { devices: count }, 'Notifications are off for this device');
};

const test = async (req, res) => {
  const r = await push.sendToUser(req.user.id, { title: 'Notifications work!', body: 'You will get follow-up and task reminders here.', tab: 'followup', tag: 'test' });
  if (!r.devices) return ApiResponse.error(res, 'Turn notifications on first.', 400);
  if (!r.sent) return ApiResponse.error(res, 'The test notification could not be delivered. Turn notifications off and on again.', 502);
  return ApiResponse.success(res, r, 'Test notification sent');
};

module.exports = { getStatus, subscribe, unsubscribe, test };
