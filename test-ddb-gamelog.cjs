const fs = require('fs');
const token = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..z4_1CS6HnQiQONouETpSjw.idBdPrl2KA2prUag-GxHhvxo91nERtWF58LJs8ihF0rT0jKedbBwQ5w6xRWio5KM.8otXsrT1y8vHxmllOqfdPQ';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Cookie': 'CobaltSession=' + token
};

async function run() {
  const res = await fetch('https://www.dndbeyond.com/campaigns/3290944', { headers });
  const html = await res.text();
  console.log('Status:', res.status, 'HTML length:', html.length);
  
  // Look for any gamelog or websocket urls in html
  const gl = html.match(/game-log[^"'\s>]*/gi) || [];
  console.log('Game-log occurrences:', [...new Set(gl)]);
  
  const wss = html.match(/wss:\/\/[^"'\s>]+/gi) || [];
  console.log('WSS occurrences:', [...new Set(wss)]);

  const cobaltTokenRes = await fetch('https://auth-service.dndbeyond.com/v1/cobalt-token', { headers });
  const tokenData = await cobaltTokenRes.json();
  console.log('Cobalt token response keys:', Object.keys(tokenData));

  // Let's test Avrae's exact endpoint for reading gamelog if any
  // e.g. https://game-log-rest-live.dndbeyond.com/v1/campaigns/3290944
  // Let's test with header 'Authorization: Bearer ' + tokenData.token vs other auth headers
  const authHeaders = [
    { name: 'Bearer', 'Authorization': `Bearer ${tokenData.token}` },
    { name: 'Token', 'Authorization': `Token ${tokenData.token}` },
    { name: 'Cobalt-Token', 'Cobalt-Token': tokenData.token },
    { name: 'X-Cobalt-Token', 'x-cobalt-token': tokenData.token },
    { name: 'Cookie-Cobalt', 'Cookie': `CobaltSession=${token}` }
  ];

  for (const h of authHeaders) {
    const r = await fetch('https://game-log-rest-live.dndbeyond.com/v1/campaigns/3290944', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        ...h
      }
    });
    console.log(`Auth header [${h.name}] -> Status:`, r.status);
    const text = await r.text();
    console.log('   Preview:', text.slice(0, 150));
  }
}

run();
