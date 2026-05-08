import MarkdownIt from "markdown-it";
import { FRONTMATTER_PATTERN, BACKLINK_PATTERN, TAG_PATTERN } from "@vaultkeeper/config";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
});

md.renderer.rules.wiki_link = (tokens, idx) => {
  const token = tokens[idx];
  return `<a class="wiki-link" href="${token.content}">${token.content}</a>`;
};

const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  tokens[idx].attrPush(["class", "wiki-link"]);
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function parseMarkdown(content: string): string {
  if (!content) return "";

  let processed = content;

  processed = processed.replace(BACKLINK_PATTERN, (match, pageName) => {
    return `[${pageName}](note://${pageName})`;
  });

  processed = processed.replace(TAG_PATTERN, (match, tag) => {
    return `<span class="tag">${match}</span>`;
  });

  return md.render(processed);
}

export function serializeMarkdown(html: string): string {
  const lines: string[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;

    switch (el.tagName.toLowerCase()) {
      case "h1":
        lines.push("");
        lines.push(`# ${el.textContent}`);
        lines.push("");
        break;
      case "h2":
        lines.push("");
        lines.push(`## ${el.textContent}`);
        lines.push("");
        break;
      case "h3":
        lines.push("");
        lines.push(`### ${el.textContent}`);
        lines.push("");
        break;
      case "p":
        lines.push("");
        lines.push(el.textContent || "");
        lines.push("");
        break;
      case "strong":
      case "b":
        lines.push(`**${el.textContent}**`);
        break;
      case "em":
      case "i":
        lines.push(`*${el.textContent}*`);
        break;
      case "code":
        if (el.parentElement?.tagName.toLowerCase() === "pre") {
          lines.push("");
          lines.push("```");
          lines.push(el.textContent || "");
          lines.push("```");
          lines.push("");
        } else {
          lines.push(`\`${el.textContent}\``);
        }
        break;
      case "blockquote":
        lines.push("");
        (el.textContent || "").split("\n").forEach((line) => {
          lines.push(`> ${line}`);
        });
        lines.push("");
        break;
      case "ul":
        Array.from(el.children).forEach((li) => {
          lines.push(`- ${li.textContent}`);
        });
        lines.push("");
        break;
      case "ol":
        Array.from(el.children).forEach((li, i) => {
          lines.push(`${i + 1}. ${li.textContent}`);
        });
        lines.push("");
        break;
      case "hr":
        lines.push("");
        lines.push("---");
        lines.push("");
        break;
      default:
        Array.from(el.childNodes).forEach(processNode);
    }
  }

  Array.from(doc.body.childNodes).forEach(processNode);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractFrontmatter(content: string): { frontmatter: string; body: string } {
  const match = content.match(FRONTMATTER_PATTERN);
  if (match) {
    return {
      frontmatter: match[1] || "",
      body: content.slice(match[0].length).trim(),
    };
  }
  return { frontmatter: "", body: content };
}

export function extractLinks(content: string): string[] {
  const links: string[] = [];
  let match;
  while ((match = BACKLINK_PATTERN.exec(content)) !== null) {
    links.push(match[1]);
  }
  return [...new Set(links)];
}

export function extractTags(content: string): string[] {
  const tags: string[] = [];
  let match;
  while ((match = TAG_PATTERN.exec(content)) !== null) {
    tags.push(match[1]);
  }
  return [...new Set(tags)];
}
