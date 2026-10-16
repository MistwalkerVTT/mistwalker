import 'dotenv/config';

async function parseCampaigns() {
  const token = process.env.DND_BEYOND_COBALT_SESSION;
  const headers = {
    'Cookie': 'CobaltSession=' + token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const res = await fetch('https://www.dndbeyond.com/my-campaigns', { headers });
  const html = await res.text();
  
  const re = /<li[^>]*class="[^"]*ddb-campaigns-list-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    console.log('--- Item Body ---');
    console.log(m[1].slice(1200, 2200));
  }
}

parseCampaigns().catch(console.error);
