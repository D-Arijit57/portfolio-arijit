import type { ContactChannel } from '../../content/contact';

/**
 * contact.sh's displayed source — pure function, ContactChannel[] in,
 * shell source text out. The same "model in, source text out" relationship
 * workHistoryToYaml() has with americanchase.yaml and modelToMermaid() has
 * with architecture.mmd: this text is only ever shown (in the editor's
 * left pane, or wherever ShikiEditor would otherwise render it), never
 * parsed back — ContactHandoff reads CONTACT_CHANNELS directly, the same
 * "one place the data lives" discipline those renderers use.
 *
 * Shape preserved from the original hand-authored script (`#!/bin/bash`,
 * one `echo "Label: value"` per channel) — only the values were ever
 * placeholders (github.com/yourusername, linkedin.com/in/yourusername);
 * the structure was already right.
 */
export function contactChannelsToShellScript(channels: ContactChannel[]): string {
  const lines = channels.map((channel) => `echo "${channel.label}: ${channel.value}"`);
  return `#!/bin/bash\n# Run this to contact me\n\n${lines.join('\n')}\n`;
}
