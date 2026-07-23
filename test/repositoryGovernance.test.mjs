import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { read } from '../testSupport/sourceFiles.mjs';

const PUBLIC_FORM_DIR = '.github/ISSUE_TEMPLATE';
const PUBLIC_FORM_PATHS = [
  `${PUBLIC_FORM_DIR}/bug.yml`,
  `${PUBLIC_FORM_DIR}/improvement.yml`,
  `${PUBLIC_FORM_DIR}/accessibility.yml`,
  `${PUBLIC_FORM_DIR}/documentation.yml`,
  `${PUBLIC_FORM_DIR}/general.yml`,
];
const publicForms = new Map(PUBLIC_FORM_PATHS.map((path) => [path, read(path)]));
const issueConfig = read(`${PUBLIC_FORM_DIR}/config.yml`);
const maintainerPhaseTemplate = read('.github/maintainer/numbered-phase-issue.md');
const pullRequestTemplate = read('.github/pull_request_template.md');
const readme = read('README.md');
const primaryDocumentPaths = [
  'docs/AI_PROJECT_CONTEXT.md',
  'docs/ARCHITECTURE.md',
  'docs/REVIEW_HISTORY.md',
];
const primaryDocuments = new Map(primaryDocumentPaths.map((documentPath) => [
  documentPath,
  read(documentPath),
]));
const historyIndex = read('docs/history/README.md');
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

const PROJECT_URL = 'https://github.com/users/Bahbus/projects/2';
const STRING_SCALAR_KEYS = new Set([
  'name', 'description', 'title', 'id', 'type', 'label', 'placeholder', 'value', 'render',
]);

function assertNoBlankStringScalars(path, source) {
  for (const [index, line] of source.split('\n').entries()) {
    const scalar = line.match(/^\s*([a-z_]+):\s*(.*)$/i);
    if (!scalar || !STRING_SCALAR_KEYS.has(scalar[1])) continue;
    const value = scalar[2].trim();
    const blankQuotedString = value.match(/^(["'])(\s*)\1(?:\s+#.*)?$/);
    assert.equal(
      value === '' || Boolean(blankQuotedString),
      false,
      `${path}:${index + 1} must omit optional string keys instead of assigning an empty value`,
    );
  }
}

function assertRequiredFields(form, requiredIds) {
  for (const id of requiredIds) {
    const start = form.indexOf(`\n    id: ${id}\n`);
    assert.notEqual(start, -1, `missing required field ${id}`);
    const nextBlock = form.indexOf('\n  - type:', start + 1);
    const block = form.slice(start, nextBlock === -1 ? undefined : nextBlock);
    if (block.includes('\n      options:')) {
      const options = block.match(/^\s+- label: /gm) ?? [];
      const requiredOptions = block.match(/^\s+required: true\b/gm) ?? [];
      assert.equal(requiredOptions.length, options.length, `${id} options must remain required`);
    } else {
      assert.match(block, /\n\s+validations:\n\s+required: true\b/, `${id} must remain required`);
    }
  }
}

function assertFormContract(path, labels, ids, requiredIds) {
  const form = publicForms.get(path);
  for (const label of labels) {
    assert.match(form, new RegExp(`labels:[\\s\\S]*- ${label.replaceAll('/', '\\/')}\\b`));
  }
  for (const id of ids) {
    assert.match(form, new RegExp(`id: ${id}\\b`));
  }
  assertRequiredFields(form, requiredIds);
}

function markdownAnchor(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function documentAnchors(source) {
  return new Set(
    source
      .split('\n')
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => markdownAnchor(line.replace(/^#{1,6}\s+/, ''))),
  );
}

function assertInternalMarkdownLinks(documentPath, source) {
  const links = [...source.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)];
  for (const [, targetWithTitle] of links) {
    const target = targetWithTitle.trim().split(/\s+(?=["'])/)[0];
    if (/^(?:https?:|mailto:)/.test(target)) continue;
    const [relativeTarget, encodedAnchor] = target.split('#', 2);
    const targetPath = relativeTarget
      ? path.resolve(repositoryRoot, path.dirname(documentPath), decodeURIComponent(relativeTarget))
      : path.resolve(repositoryRoot, documentPath);
    assert.equal(
      existsSync(targetPath),
      true,
      `${documentPath} links to missing internal target ${target}`,
    );
    if (!encodedAnchor) continue;
    const targetSource = read(path.relative(repositoryRoot, targetPath));
    assert.equal(
      documentAnchors(targetSource).has(decodeURIComponent(encodedAnchor)),
      true,
      `${documentPath} links to missing heading ${target}`,
    );
  }
}

test('the chooser links planned work and private security reporting in plain language', () => {
  assert.match(readme, new RegExp(PROJECT_URL.replaceAll('/', '\\/')));
  assert.match(issueConfig, new RegExp(PROJECT_URL.replaceAll('/', '\\/')));
  assert.match(issueConfig, /blank_issues_enabled: false/);
  assert.match(issueConfig, /name: Planned work/);
  assert.match(issueConfig, /security\/advisories\/new/);
  assert.match(issueConfig, /do not share passwords, tokens, private data, or security details/i);
});

test('the public chooser contains focused forms and no internal workflow forms', () => {
  const publicFiles = readdirSync(PUBLIC_FORM_DIR).sort();
  assert.deepEqual(publicFiles, [
    'accessibility.yml',
    'bug.yml',
    'config.yml',
    'documentation.yml',
    'general.yml',
    'improvement.yml',
  ]);
  assert.equal(existsSync(`${PUBLIC_FORM_DIR}/phase.yml`), false);
  assert.equal(existsSync(`${PUBLIC_FORM_DIR}/review-finding.yml`), false);

  const publicText = `${issueConfig}\n${[...publicForms.values()].join('\n')}`;
  assert.doesNotMatch(publicText, /numbered phase|phase boundary|review finding|roadmap candidate|project synchronization|implementation acceptance/i);
});

test('public forms omit empty and whitespace-only string scalars rejected by GitHub', () => {
  for (const [path, form] of publicForms) assertNoBlankStringScalars(path, form);
  assert.throws(
    () => assertNoBlankStringScalars('empty.yml', 'name: Example\ntitle: ""\nbody:\n'),
    /must omit optional string keys/,
  );
  assert.throws(
    () => assertNoBlankStringScalars('whitespace.yml', "name: Example\ntitle: '   '\nbody:\n"),
    /must omit optional string keys/,
  );
});

test('the bug form collects reproduction and diagnostic details safely', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/bug.yml`, ['bug', 'triage'], [
    'summary', 'steps', 'expected', 'actual', 'app_source', 'environment',
    'aetherbags_version', 'evidence', 'checks',
  ], [
    'summary', 'steps', 'expected', 'actual', 'app_source', 'environment', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/bug.yml`);
  assert.match(form, /published website or a local copy/i);
  assert.match(form, /import, export, or plugin compatibility/i);
  assert.match(form, /remove any personal or unrelated information/i);
});

test('the improvement form asks about the desired result without requiring implementation knowledge', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/improvement.yml`, ['enhancement', 'triage'], [
    'goal', 'current_workflow', 'proposed_change', 'benefit', 'alternatives', 'evidence', 'checks',
  ], [
    'goal', 'current_workflow', 'proposed_change', 'benefit', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/improvement.yml`);
  assert.match(form, /you do not need to know how the editor is built/i);
  assert.match(form, /rough idea is fine/i);
});

test('the accessibility form collects the affected interaction and relevant environment', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/accessibility.yml`, ['ui/ux', 'triage'], [
    'summary', 'steps', 'expected', 'actual', 'assistive_technology', 'app_source',
    'environment', 'evidence', 'checks',
  ], [
    'summary', 'steps', 'expected', 'actual', 'app_source', 'environment', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/accessibility.yml`);
  assert.match(form, /no accessibility expertise is required/i);
  assert.match(form, /keyboard commands or zoom settings/i);
});

test('the documentation form identifies the location, problem, and useful correction', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/documentation.yml`, ['documentation', 'triage'], [
    'location', 'problem', 'suggested_change', 'context', 'checks',
  ], [
    'location', 'problem', 'suggested_change', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/documentation.yml`);
  assert.match(form, /URL or section name/);
  assert.match(form, /does not need to be final wording/i);
});

test('the general form preserves a safe path for questions and uncategorized problems', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/general.yml`, ['question', 'triage'], [
    'summary', 'details', 'app_source', 'environment', 'evidence', 'checks',
  ], [
    'summary', 'details', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/general.yml`);
  assert.match(form, /none of the other choices fit/i);
  assert.match(form, /private security link/i);
  assert.match(form, /passwords, tokens, personal information, private category data, and security details/i);
});

test('maintainers retain a reusable numbered-phase workflow outside the public chooser', () => {
  assert.equal(existsSync('.github/maintainer/numbered-phase-issue.md'), true);
  for (const heading of [
    'Summary', 'Review evidence and Project decision', 'Implementation',
    'Behavioral contracts', 'Verification', 'Completion synchronization',
  ]) {
    assert.match(maintainerPhaseTemplate, new RegExp(`## ${heading}`));
  }
  for (const path of ['docs/AI_PROJECT_CONTEXT.md', 'docs/ARCHITECTURE.md', 'docs/REVIEW_HISTORY.md']) {
    assert.match(maintainerPhaseTemplate, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.match(readme, /only repository maintainers create numbered phase issues/i);
  assert.match(readme, /GitHub does not provide per-user visibility for an issue form in a public repository/i);
  assert.match(readme, /--body-file \.github\/maintainer\/numbered-phase-issue\.md/);
});

test('pull requests link their issue, record real verification, synchronize durable state, and enter review immediately', () => {
  assert.match(pullRequestTemplate, /Closes #/);
  assert.match(pullRequestTemplate, /`npm run check`/);
  assert.match(pullRequestTemplate, /`git diff --check origin\/main`/);
  for (const path of ['docs/AI_PROJECT_CONTEXT.md', 'docs/ARCHITECTURE.md', 'docs/REVIEW_HISTORY.md']) {
    assert.match(pullRequestTemplate, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.match(pullRequestTemplate, /current linked item/);
  assert.match(pullRequestTemplate, /Project #2/);
  assert.match(pullRequestTemplate, /ready for review, not a draft/i);
});

test('the three primary durable documents have distinct roles and required routing', () => {
  const requiredHeadings = new Map([
    ['docs/AI_PROJECT_CONTEXT.md', [
      'Required entry order and document roles',
      'Current state',
      'Standard workflow',
      'Behavioral contracts',
      'Working environment',
      'Deeper records',
    ]],
    ['docs/ARCHITECTURE.md', [
      'System shape',
      'Testing architecture',
      'Repository planning and governance',
      'Current pressure points',
      'Related records',
    ]],
    ['docs/REVIEW_HISTORY.md', [
      'How to use this record',
      'Chronological index',
      'Recent verified record',
      'Recording future work',
    ]],
  ]);

  for (const [documentPath, headings] of requiredHeadings) {
    const source = primaryDocuments.get(documentPath);
    for (const heading of headings) {
      assert.match(source, new RegExp(`^## ${heading}$`, 'm'), `${documentPath} must retain ${heading}`);
    }
  }

  assert.doesNotMatch(
    primaryDocuments.get('docs/AI_PROJECT_CONTEXT.md'),
    /^## Phase \d/m,
    'current context must not become a phase journal',
  );
  assert.doesNotMatch(
    primaryDocuments.get('docs/ARCHITECTURE.md'),
    /^## Phase \d/m,
    'current architecture must not become a phase journal',
  );
  for (const linkedPath of primaryDocumentPaths) {
    const otherPrimarySources = [...primaryDocuments.entries()]
      .filter(([documentPath]) => documentPath !== linkedPath)
      .map(([, source]) => source)
      .join('\n');
    assert.match(otherPrimarySources, new RegExp(path.basename(linkedPath).replaceAll('.', '\\.')));
  }
  assert.match(primaryDocuments.get('docs/REVIEW_HISTORY.md'), /history\/README\.md/);
});

test('durable history archives are indexed once and reachable from the primary review record', () => {
  const archiveFiles = readdirSync('docs/history')
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort();
  assert.deepEqual(archiveFiles, ['PHASES_27_77.md']);
  for (const archiveFile of archiveFiles) {
    const escapedName = archiveFile.replaceAll('.', '\\.');
    assert.match(historyIndex, new RegExp(escapedName), `${archiveFile} must be in the history index`);
    assert.match(
      primaryDocuments.get('docs/REVIEW_HISTORY.md'),
      new RegExp(escapedName),
      `${archiveFile} must be reachable from REVIEW_HISTORY.md`,
    );
  }
  const archivedPhases = read('docs/history/PHASES_27_77.md');
  for (const phase of ['27', '38', '46', '56', '67', '73', '74', '75', '76', '77']) {
    assert.match(archivedPhases, new RegExp(`^## Phase ${phase}(?:\\b|\\.)`, 'm'));
  }
});

test('all internal Markdown links in durable documentation resolve', () => {
  const documentPaths = [
    ...primaryDocumentPaths,
    ...readdirSync('docs/history')
      .filter((name) => name.endsWith('.md'))
      .map((name) => `docs/history/${name}`),
  ];
  for (const documentPath of documentPaths) {
    assertInternalMarkdownLinks(documentPath, read(documentPath));
  }
});

test('the primary durable entry set stays below its anti-journal size budget', () => {
  const baselineBytes = 410198;
  const baselineLines = 4141;
  const currentBytes = primaryDocumentPaths
    .map((documentPath) => statSync(documentPath).size)
    .reduce((total, size) => total + size, 0);
  const currentLines = primaryDocumentPaths
    .map((documentPath) => read(documentPath).split('\n').length - 1)
    .reduce((total, lines) => total + lines, 0);

  assert.ok(currentBytes <= 180000, `primary documents use ${currentBytes} bytes`);
  assert.ok(currentLines <= 2000, `primary documents use ${currentLines} lines`);
  assert.ok(currentBytes <= baselineBytes / 2, 'Phase 78 must reduce primary bytes by at least 50%');
  assert.ok(currentLines <= baselineLines / 2, 'Phase 78 must reduce primary lines by at least 50%');
});

test('phase and pull-request templates require relevant documentation updates without boilerplate', () => {
  for (const template of [maintainerPhaseTemplate, pullRequestTemplate]) {
    assert.match(template, /AI_PROJECT_CONTEXT\.md/);
    assert.match(template, /REVIEW_HISTORY\.md/);
    assert.match(template, /ARCHITECTURE\.md/);
    assert.match(template, /current content changed|content changed/i);
    assert.match(template, /not applicable/i);
    assert.match(template, /repetitive|affected documents/i);
  }
});

test('durable status wording stays merge-neutral and routes live state to Project #2', () => {
  const currentContext = primaryDocuments.get('docs/AI_PROJECT_CONTEXT.md');
  const reviewHistory = primaryDocuments.get('docs/REVIEW_HISTORY.md');

  assert.doesNotMatch(currentContext, /Current baseline:.*Phase \d/i);
  assert.doesNotMatch(currentContext, /current merged baseline|tracked by (?:Issue|#)/i);
  assert.match(currentContext, /Project #2 is authoritative for live phase status/i);
  assert.match(reviewHistory, /merge-neutral/i);

  for (const source of [
    currentContext,
    reviewHistory,
    maintainerPhaseTemplate,
    pullRequestTemplate,
  ]) {
    assert.match(source, /capabilit(?:y|ies)/i);
    assert.match(source, /Project #2/i);
  }

  for (const template of [maintainerPhaseTemplate, pullRequestTemplate]) {
    assert.match(template, /before and after merge/i);
    assert.match(template, /do not predict|without predicting/i);
    assert.match(template, /post-merge documentation correction/i);
    assert.match(template, /merged code or verified behavior actually disagrees/i);
  }
});

test('review guidance preserves the complete contract with compact routine output', () => {
  const guidance = [
    primaryDocuments.get('docs/AI_PROJECT_CONTEXT.md'),
    maintainerPhaseTemplate,
    pullRequestTemplate,
  ].join('\n');

  assert.match(guidance, /npm run check -- --test-reporter=dot/);
  assert.match(guidance, /canonical/i);
  assert.match(guidance, /same syntax checker, static-import checker, complete Node test suite/i);
  assert.match(guidance, /once per exact tree|once for this exact tree/i);
  assert.match(guidance, /ordinary `npm run check` or (?:the relevant |a )?targeted test/i);
  assert.match(guidance, /classif(?:y|ied) the changed-file scope/i);
  assert.match(guidance, /history archives only when older evidence (?:is|was) relevant/i);
  assert.match(guidance, /current (?:linked )?issue(?:\/| and its current )Project item/i);
  assert.match(guidance, /entire completed board/i);
});
