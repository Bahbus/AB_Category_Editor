import test from 'node:test';
import assert from 'node:assert/strict';

import { read } from '../testSupport/sourceFiles.mjs';

const phaseForm = read('.github/ISSUE_TEMPLATE/phase.yml');
const reviewForm = read('.github/ISSUE_TEMPLATE/review-finding.yml');
const generalForm = read('.github/ISSUE_TEMPLATE/general.yml');
const issueConfig = read('.github/ISSUE_TEMPLATE/config.yml');
const pullRequestTemplate = read('.github/pull_request_template.md');
const readme = read('README.md');

const PROJECT_URL = 'https://github.com/users/Bahbus/projects/2';

test('repository entrypoints link the canonical public Roadmap', () => {
  assert.match(readme, new RegExp(PROJECT_URL.replaceAll('/', '\\/')));
  assert.match(issueConfig, new RegExp(PROJECT_URL.replaceAll('/', '\\/')));
  assert.match(issueConfig, /blank_issues_enabled: false/);
});

test('numbered phase issues require evidence, contracts, verification, docs, Project sync, and a linked PR', () => {
  assert.match(phaseForm, /labels:\s+[\s\S]*- roadmap[\s\S]*- phase/);
  for (const id of ['summary', 'evidence', 'implementation', 'contracts', 'verification', 'completion']) {
    assert.match(phaseForm, new RegExp(`id: ${id}\\b`));
  }
  for (const path of ['docs/AI_PROJECT_CONTEXT.md', 'docs/ARCHITECTURE.md', 'docs/REVIEW_HISTORY.md']) {
    assert.match(phaseForm, new RegExp(path.replaceAll('.', '\\.')));
  }
  assert.match(phaseForm, /Update the Roadmap item fields/);
  assert.match(phaseForm, /Link the pull request to this issue with a closing keyword/);
});

test('review findings distinguish evidence, impact, phase boundaries, and Project priority', () => {
  assert.match(reviewForm, /labels:\s+[\s\S]*- roadmap/);
  for (const id of ['classification', 'evidence', 'impact', 'candidate', 'project_sync']) {
    assert.match(reviewForm, new RegExp(`id: ${id}\\b`));
  }
  assert.match(reviewForm, /Next, Soon, Later, or On Hold/);
  assert.match(reviewForm, /Add this issue to the AB Category Editor Roadmap and set Priority and Area/);
});

test('general issue reports support users and maintainers without requiring internal phase knowledge', () => {
  assert.match(generalForm, /labels:\s+[\s\S]*- triage/);
  for (const id of ['kind', 'summary', 'steps', 'expected', 'actual', 'app_version', 'environment', 'aetherbags_version', 'evidence', 'checks']) {
    assert.match(generalForm, new RegExp(`id: ${id}\\b`));
  }
  for (const kind of ['Bug or regression', 'data-loss concern', 'Accessibility or keyboard/focus problem', 'UI or responsive-layout improvement', 'Feature request', 'Documentation problem', 'Question or support request']) {
    assert.match(generalForm, new RegExp(kind.replaceAll('/', '\\/'), 'i'));
  }
  assert.match(generalForm, /small, sanitized example/i);
  assert.match(generalForm, /published GitHub Pages app or a local checkout\/commit/i);
  assert.match(generalForm, /AetherBags version/);
  assert.match(generalForm, /searched existing issues and the Roadmap/i);
  assert.match(generalForm, /removed secrets, private data, and unrelated configuration/i);
  assert.doesNotMatch(generalForm, /assign(?:ed)? phase|move it to `?In Progress|implementation acceptance/i);
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
