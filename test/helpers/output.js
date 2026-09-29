const chalk = (() => {
  const esc = '\x1b[';
  const c = (n) => `${esc}${n}m`;
  return {
    reset: c(0),
    bold: c(1),
    dim: c(2),
    red: c(31),
    green: c(32),
    yellow: c(33),
    blue: c(34),
    magenta: c(35),
    cyan: c(36),
    gray: c(90),
  };
})();

let passed = 0;
let failed = 0;

function banner(title, icon = '🧪') {
  const line = '='.repeat(60);
  console.log(`\n${chalk.bold}${chalk.blue}${line}${chalk.reset}`);
  console.log(`${chalk.bold}${icon}  ${title}${chalk.reset}`);
  console.log(`${chalk.bold}${chalk.blue}${line}${chalk.reset}`);
}

function step(msg) {
  console.log(`  ${chalk.cyan}▸${chalk.reset} ${msg}`);
}

function info(msg) {
  console.log(`  ${chalk.gray}ℹ${chalk.reset} ${msg}`);
}

function success(msg) {
  console.log(`  ${chalk.green}✓${chalk.reset} ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  ${chalk.red}✗${chalk.reset} ${msg}`);
  failed++;
}

function data(label, obj) {
  const json = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  console.log(`  ${chalk.gray}${label}:${chalk.reset}\n${chalk.gray}${json
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n')}${chalk.reset}`);
}

function warn(msg) {
  console.log(`  ${chalk.yellow}⚠${chalk.reset} ${msg}`);
}

function summary() {
  console.log(`\n${chalk.bold}${'='.repeat(60)}${chalk.reset}`);
  console.log(`${chalk.bold}Test Summary${chalk.reset}`);
  console.log(`  ${chalk.green}Passed: ${passed}${chalk.reset}`);
  console.log(`  ${chalk.red}Failed: ${failed}${chalk.reset}`);
  console.log(`${chalk.bold}${'='.repeat(60)}${chalk.reset}\n`);
}

function result(label, ok, detail) {
  if (ok) success(label);
  else fail(label + (detail ? ` — ${detail}` : ''));
}

module.exports = { chalk, banner, step, info, success, fail, data, warn, summary, result };
