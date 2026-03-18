const config = require('config/tailwind.config')

module.exports = config({
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './../../packages/ui/src/**/*.{tsx,ts,js}',
    './../../packages/ui-patterns/src/**/*.{tsx,ts,js}',
    './../../packages/platform/src/**/*.{tsx,ts,js}',
  ],
})
