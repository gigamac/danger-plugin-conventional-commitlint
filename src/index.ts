// Provides dev-time type structures for  `danger` - doesn't affect runtime.
import lint from '@commitlint/lint';
import load from '@commitlint/load';
import {
  LintOutcome,
  ParserPreset,
  ParserOptions,
  LintOptions,
} from '@commitlint/types';
import { DangerDSLType } from '../node_modules/danger/distribution/dsl/DangerDSL';
declare const danger: DangerDSLType;
export declare function message(message: string): void;
export declare function warn(message: string): void;
export declare function fail(message: string): void;

export interface ReplacerContext {
  ruleOutcome: LintOutcome;
  commitMessage: string;
}

export interface CommitlintPluginConfig {
  severity?: 'fail' | 'warn' | 'message' | 'disable';
  messageReplacer?: (context: ReplacerContext) => string;
}

interface Rules {
  'body-leading-blank': Array<number | string>;
  'footer-leading-blank': Array<number | string>;
  'header-max-length': Array<number | string>;
  'scope-case': Array<number | string>;
  'subject-case': Array<string[] | number | string>;
  'subject-empty': Array<number | string>;
  'subject-full-stop': Array<number | string>;
  'type-case': Array<number | string>;
  'type-empty': Array<number | string>;
  'type-enum': Array<string[] | number | string>;
  [key: string]: Array<string[] | number | string>;
}

const messageReplacer = ({ ruleOutcome, commitMessage }) => {
  let failureMessage = `There is a problem with the commit message\n> ${commitMessage}`;

  ruleOutcome.errors.forEach((error) => {
    failureMessage = `${failureMessage}\n- ${error.message}`;
  });

  return failureMessage;
};

const defaultConfig = {
  severity: 'fail' as const,
  messageReplacer,
};

export default async function commitlint(
  rules: Rules,
  userConfig?: CommitlintPluginConfig
): Promise<void> {
  const config = { ...defaultConfig, ...userConfig };

  for (const commit of danger.git.commits) {
    await lintCommitMessage(commit.message, rules, config);
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function localCommitLint(
  userConfig?: CommitlintPluginConfig
): Promise<void> {
  const config = { ...defaultConfig, ...userConfig };
  const loaded = await load();
  const parserOpts = selectParserOpts(loaded.parserPreset);
  const opts: LintOptions & { parserOpts: ParserOptions } = {
    parserOpts: {},
    plugins: {},
    ignores: [],
    defaultIgnores: true,
  };
  if (parserOpts) {
    opts.parserOpts = parserOpts;
  }
  if (loaded.plugins) {
    opts.plugins = loaded.plugins;
  }
  if (loaded.ignores) {
    opts.ignores = loaded.ignores;
  }
  if (loaded.defaultIgnores === false) {
    opts.defaultIgnores = false;
  }
  for (const commit of danger.git.commits) {
    await lintCommitMessage(commit.message, loaded.rules, config);
  }
}

async function lintCommitMessage(
  commitMessage,
  rules,
  config: Required<CommitlintPluginConfig>
) {
  return lint(commitMessage, rules).then((ruleOutcome) => {
    if (!ruleOutcome.valid) {
      const failureMessage = config.messageReplacer({
        ruleOutcome,
        commitMessage,
      });

      switch (config.severity) {
        case 'fail':
          fail(failureMessage);
          break;
        case 'warn':
          warn(failureMessage);
          break;
        case 'message':
          message(failureMessage);
          break;
        case 'disable':
          break;
      }
    }
  });
}

function selectParserOpts(parserPreset: ParserPreset | undefined) {
  if (typeof parserPreset !== 'object') {
    return undefined;
  }

  if (typeof parserPreset.parserOpts !== 'object') {
    return undefined;
  }

  return parserPreset.parserOpts;
}
