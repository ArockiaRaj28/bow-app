// app/favicon.ico/route.ts
//
// Serves the real BOW logo (32×32 PNG rendered from
// scripts/logo-master.svg via sharp) in favicon.ico format, with
// long-lived cache headers so subsequent reloads skip the round trip.
export const dynamic = 'force-static'

const FAVICON_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAC4jAAAuIwF4pT92AAAEDElEQVR4nMWXyU8bZxiH59r+O700vTRpoSwGszoQCoYECBRCiDeCAWPWGKmhqlqpUVt6SDcRJA5tI1WVuPSQ5BIph0YNUdSGpCAlBXs88y1jsD2/6p0JS8NM5FIBlp6DZ3t+3zLfN6+i7Pm9EcfrJTMyWJGQd8oTMulJSFRcsamclvASUxJVxKRE9aREDTEhUTshUTcuLOrHbHxjAqfjAr5RkTwzxu80xGTQF8BritPv1KR8yzMj10qmJN6OC5yMC5watXknJvAuMSJQRAwLFA8LvEcMCZQMCZRGuUXZoE35IIfnsk3FAEflAEf9EEfTKFutDssT++QVMyJzcuzw5JURDm+EoyrC0RxjGV9YO7HT7dTyo5B7wxxVYY6aCKMQq9Zw0JgfZre/LK8OM1SHGBoHGZqiIqDQhDtqeU2IoTbI4B9ht5TyK0I9DjnREuVJCmAeh7wuwNAcZabimZbHIidaohxWgFfJK+MC/dcMRL+yGZrbZfhLm5FtvjAQIz43EPlE4nTUXV4fYPAPcigVU9JV3veZgaRmghvA/Sd5/LayHzouMoBp7ieZNhH+WDjKfZdeBKikAC7dvvw0h1zexO0HeXx6M+sKnafrnHi4knOUE62XKcCkdB1zY9PEVtaEzJh4/DyPP5/th45vX+cEnXOSn+5naKMAXgrgMuE2t0wImcfKWuZA0L30DCd5AwUYYFC8E9J1tlN6an0ynSucew+R+uVXJB+tWffSM5zkDRd1nKUAVRPS9VUTRr5w+Ba0WBxqaSnUoiKoHg/Y9zesc07yRgoQYVCqKYDLe85lvmD0G4uWPHv3LrSWFmwuLUEtLgb7/ZGjvLFPxzkrwLh0XWR0kS+Y9Mio1XKRSCC/ugrN77f+a/OLjvIzfTraKUDNuHRd4dI8VzDqhx9Zwsz8PExVhZidtYfi5yVHeRMFCDMotWPCdXlV9Vzh3P8DalkZ0l4vMgsLSHs8UP1tUDeEo7zpgo6O7QBua3tSy/0nUveWkRqKQW3vRGpmFqkn69ZxJ/n7F3R0hhiUurhw3VgerGSxns79L5YfbznKm3v3BCh32dUS1w08T2bxd+pgPNvI4uqcdJQT50MMSn1cvHJL7bsqcG3RwPWbBr4mfrL5Zg/f/rjLd8QPBuYWJELTzFXe0vMigG+Umwfdz91WOLcx3ysnuoK6qfjiInUccn+Pju4AW1eoYjkOeesHOnpD6VsKlUtUsRy1vLNfR9clFlCoOKByiSqWo5K39WjoDep/7dSJVKtRuUQVy9HINaOjW3vzX/Uh1WpULlHFcpjdTi3fJ98JQcMRFQH/CLvdHOUb9Nnsj3K0DtrQJ9RZC4ZzxABD+wBDBxFh6IwwnA/bdIV26Q6yDZpwnRe1wMvl+T9FrXistCnV4wAAAABJRU5ErkJggg==',
  'base64',
)

export function GET(): Response {
  return new Response(FAVICON_PNG, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
