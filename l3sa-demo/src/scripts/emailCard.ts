import type { EmailPreview } from '../../shared/types';
import { h } from './dom';

export interface EmailLabels { who?: string; to: string; subject: string }

export function emailCard(e: EmailPreview, labels: EmailLabels): HTMLElement {
  return h('article', { class: 'email-card' },
    h('header', {},
      labels.who ? h('div', { class: 'who', text: labels.who }) : null,
      h('div', { class: 'row' }, h('b', { text: labels.to }), h('span', { text: e.to_address })),
      h('div', { class: 'row' }, h('b', { text: labels.subject }), h('span', { text: e.subject })),
    ),
    h('pre', { text: e.body }),
  );
}
