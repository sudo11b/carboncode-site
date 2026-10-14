import { Hono } from 'hono';
import { publicRoutes } from './routes/public';
import { adminRoutes } from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Robots-Tag', 'noindex, nofollow');
  c.header('Cache-Control', 'no-store');
});

app.route('/api', publicRoutes);
app.route('/api/admin', adminRoutes);

app.notFound((c) => c.json({ ok: false, error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: 'server_error' }, 500);
});

export default app;
