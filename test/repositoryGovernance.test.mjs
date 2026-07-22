import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';

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

const PROJECT_URL = 'https://github.com/users/Bahbus/projects/2';

function assertFormContract(path, labels, ids) {
  const form = publicForms.get(path);
  for (const label of labels) {
    assert.match(form, new RegExp(`labels:[\\s\\S]*- ${label.replaceAll('/', '\\/')}\\b`));
  }
  for (const id of ids) {
    assert.match(form, new RegExp(`id: ${id}\\b`));
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

test('the bug form collects reproduction and diagnostic details safely', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/bug.yml`, ['bug', 'triage'], [
    'summary', 'steps', 'expected', 'actual', 'app_source', 'environment',
    'aetherbags_version', 'evidence', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/bug.yml`);
  assert.match(form, /published website or a local copy/i);
  assert.match(form, /import, export, or plugin compatibility/i);
  assert.match(form, /remove any personal or unrelated information/i);
});

test('the improvement form asks about the desired result without requiring implementation knowledge', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/improvement.yml`, ['enhancement', 'triage'], [
    'goal', 'current_workflow', 'proposed_change', 'benefit', 'alternatives', 'evidence', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/improvement.yml`);
  assert.match(form, /you do not need to know how the editor is built/i);
  assert.match(form, /rough idea is fine/i);
});

test('the accessibility form collects the affected interaction and relevant environment', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/accessibility.yml`, ['ui/ux', 'triage'], [
    'summary', 'steps', 'expected', 'actual', 'assistive_technology', 'app_source',
    'environment', 'evidence', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/accessibility.yml`);
  assert.match(form, /no accessibility expertise is required/i);
  assert.match(form, /keyboard commands or zoom settings/i);
});

test('the documentation form identifies the location, problem, and useful correction', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/documentation.yml`, ['documentation', 'triage'], [
    'location', 'problem', 'suggested_change', 'context', 'checks',
  ]);
  const form = publicForms.get(`${PUBLIC_FORM_DIR}/documentation.yml`);
  assert.match(form, /URL or section name/);
  assert.match(form, /does not need to be final wording/i);
});

test('the general form preserves a safe path for questions and uncategorized problems', () => {
  assertFormContract(`${PUBLIC_FORM_DIR}/general.yml`, ['question', 'triage'], [
    'summary', 'details', 'app_source', 'environment', 'evidence', 'checks',
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
  assert.match(pullRequestTemplate, /Updated the linked AB Category Editor Roadmap item/);
  assert.match(pullRequestTemplate, /ready for review, not a draft/i);
});
