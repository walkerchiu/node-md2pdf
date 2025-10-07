module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-conventionalcommits',
  rules: {
    'body-case': [2, 'always', 'sentence-case'],
    'body-full-stop': [2, 'always', '.'],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],
    'subject-case': [2, 'always', ['sentence-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'type-case': [2, 'always', 'sentence-case'],
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'Build',
        'Chore',
        'CI',
        'Deprecate',
        'Docs',
        'Feat',
        'Fix',
        'Perf',
        'Refactor',
        'Revert',
        'Style',
        'Test',
      ],
    ],
    'scope-case': [2, 'always', 'sentence-case'],
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [
        'API',
        'Config',
        'Framework',
        'Function',
        'Git',
        'Infra',
        'Lang',
        'Module',
        'Project',
        'Theme',
        'Vendor',
        'Views',
      ],
    ],
  },
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing",
        enum: {
          Build: {
            description:
              'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
            title: 'Builds',
            emoji: '🛠',
          },
          Chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '♻️',
          },
          CI: {
            description:
              'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          Deprecate: {
            description: 'Deprecating code or features',
            title: 'Deprecations',
            emoji: '🗑',
          },
          Docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '📚',
          },
          Feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '✨',
          },
          Fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          Perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          Refactor: {
            description:
              'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          Test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '🚨',
          },
          Revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '🗑',
          },
          Style: {
            description:
              'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
            title: 'Styles',
            emoji: '💎',
          },
        },
      },
      scope: {
        description:
          'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description:
          'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description:
          'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description:
          'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "Fix #123", "Re #123".)',
      },
    },
  },
  helpUrl: '',
};
