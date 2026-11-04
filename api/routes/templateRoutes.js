const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const library = require('../lib/templateLibrary');
const router = express.Router();
const assets = express.Router();

router.get('/', (req, res, next) => {
  try { res.set('Cache-Control', 'public, max-age=300').json(library.catalog()); } catch (error) { next(error); }
});
// Assets are scoped to one rendered template; neither paths nor directory listings are accepted.
assets.get('/:token/:asset', (req, res) => {
  try {
    const claims = jwt.verify(req.params.token, process.env.JWT_SECRET, { audience: 'template-assets', algorithms: ['HS256'] });
    if (claims.scope !== 'template-assets') throw new Error('Invalid scope');
    const layout = library.definition(claims.templateId);
    if (!layout.assets.includes(req.params.asset)) return res.sendStatus(404);
    res.set({ 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' });
    res.sendFile(req.params.asset, { root: require('node:path').join(library.root, 'assets'), dotfiles: 'deny' });
  } catch { res.sendStatus(403); }
});
router.use(rateLimit({ windowMs: 60000, limit: 90, skip: () => process.env.NODE_ENV === 'test', message: { message: 'Vui lòng chờ một chút rồi thử lại.' } }));
// Public demos always use the original sample; caller edits remain owner-only.
router.get('/:id/demo', (req, res, next) => {
  try {
    const selected = library.selection({ templateId: req.params.id, values: {}, opening: true, motion: true });
    res.set('Cache-Control', 'no-store').json({ html: library.render(selected) });
  } catch (error) { next(error); }
});
router.use(auth);
router.get('/:id/fields', (req, res, next) => {
  try { res.set('Cache-Control', 'no-store').json(library.editableFields(req.params.id)); } catch (error) { next(error); }
});
module.exports = router;
module.exports.assets = assets;
