import { isDevelopmentServer } from '~/app/config/runtime';

export async function previewQuestionnaireNotification(): Promise<void> {
  if (!isDevelopmentServer) throw new Error('Notification previews require npm run dev');
  // This endpoint belongs to Vite, not to the configured ActivityWatch server.
  const response = await fetch('/api/0/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'feedback' }),
  });
  if (!response.ok) throw new Error('Unable to preview notification');
}
