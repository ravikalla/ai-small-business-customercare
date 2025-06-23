module.exports = {
  default: {
    require: [
      'tests/support/world.js',
      'tests/support/hooks.js',
      'tests/step_definitions/**/*.js'
    ],
    format: [
      'progress',
      'json:test-reports/cucumber_report.json',
      'html:test-reports/cucumber_report.html'
    ],
    formatOptions: {
      snippetInterface: 'async-await'
    },
    paths: ['tests/features/**/*.feature'],
    parallel: 1
  }
};