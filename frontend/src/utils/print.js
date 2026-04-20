export function escapePrintHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
export function joinPrintLines(lines) {
    return lines.map((item) => String(item ?? '').trim()).filter(Boolean).join(' / ');
}
export function printHtmlDocument(title, bodyHtml) {
    const printWindow = window.open('', '_blank', 'width=1080,height=840');
    if (!printWindow) {
        throw new Error('无法打开打印窗口');
    }
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapePrintHtml(title)}</title>
  <style>
    :root {
      --ink: #1f1f1f;
      --muted: #666;
      --line: #d9d9d9;
      --accent: #ee4d2d;
      --panel: #fff;
      --paper: #faf8f4;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      color: var(--ink);
      background: var(--paper);
      font: 14px/1.5 "Microsoft YaHei", "PingFang SC", sans-serif;
    }
    .print-shell {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 12mm;
      background: var(--panel);
    }
    .print-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--ink);
    }
    .print-head h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
    }
    .print-head p {
      margin: 4px 0 0;
      color: var(--muted);
    }
    .print-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 92px;
      padding: 6px 12px;
      border: 1px solid var(--ink);
      font-weight: 700;
    }
    .print-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }
    .print-card {
      border: 1px solid var(--line);
      padding: 12px;
      break-inside: avoid;
    }
    .print-card h2 {
      margin: 0 0 8px;
      font-size: 15px;
    }
    .print-card dl {
      margin: 0;
      display: grid;
      grid-template-columns: 88px minmax(0, 1fr);
      gap: 6px 10px;
    }
    .print-card dt {
      color: var(--muted);
    }
    .print-card dd {
      margin: 0;
      word-break: break-all;
    }
    .print-block {
      margin-bottom: 14px;
      break-inside: avoid;
    }
    .print-block h2 {
      margin: 0 0 8px;
      font-size: 16px;
      padding-left: 8px;
      border-left: 4px solid var(--accent);
    }
    .print-block p {
      margin: 0;
    }
    .print-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      break-inside: auto;
    }
    .print-table th,
    .print-table td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      vertical-align: top;
      text-align: left;
      word-break: break-word;
    }
    .print-table th {
      background: #f4f4f4;
      font-weight: 700;
    }
    .print-note {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed var(--line);
      color: var(--muted);
      font-size: 12px;
    }
    .label-shell {
      border: 2px solid var(--ink);
      padding: 12px;
      margin-bottom: 16px;
    }
    .label-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .label-code {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 2px;
      word-break: break-all;
    }
    .label-route {
      margin: 10px 0;
      font-size: 16px;
      font-weight: 700;
    }
    .label-address {
      font-size: 18px;
      line-height: 1.6;
      min-height: 72px;
    }
    .label-contact {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .label-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
      font-size: 13px;
    }
    @media print {
      body { background: #fff; }
      .print-shell {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main class="print-shell">
    ${bodyHtml}
  </main>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 120);
    };
  </script>
</body>
</html>`;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}
export function renderPrintHead(title, subtitle, chip) {
    return `
    <header class="print-head">
      <div>
        <h1>${escapePrintHtml(title)}</h1>
        ${subtitle ? `<p>${escapePrintHtml(subtitle)}</p>` : ''}
      </div>
      ${chip ? `<span class="print-chip">${escapePrintHtml(chip)}</span>` : ''}
    </header>
  `;
}
export function renderPrintFieldGrid(sections) {
    return `
    <section class="print-grid">
      ${sections.map((section) => `
        <article class="print-card">
          <h2>${escapePrintHtml(section.title)}</h2>
          <dl>
            ${section.fields.map((field) => `
              <dt>${escapePrintHtml(field.label)}</dt>
              <dd>${escapePrintHtml(field.value)}</dd>
            `).join('')}
          </dl>
        </article>
      `).join('')}
    </section>
  `;
}
export function renderPrintTable(title, headers, rows) {
    return `
    <section class="print-block">
      <h2>${escapePrintHtml(title)}</h2>
      <table class="print-table">
        <thead>
          <tr>${headers.map((item) => `<th>${escapePrintHtml(item)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapePrintHtml(cell)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </section>
  `;
}
