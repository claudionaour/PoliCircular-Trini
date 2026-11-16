import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'functions/lib/**/*', 'dev-dist/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
