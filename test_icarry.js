import fetch from 'node-fetch';

async function testIcarry() {
    const username = 'ela13167';
    const key = 'i0juPVMiqDihdQMUxZNQPhViPlXuiyQmHsCmNBAV3cncCpfNqTgLjOPa6fiXWMsS1rZMpgQm8NAXoY2JwTSCfZ6NrlOOVJvwWsHwlsDLxf64tSQVErJFHjOkTPyaevRDrXk6CwlXq003aAiufaw6GAYc1k6DxZh6LJgCllFCgLm4KGjhy5tuAAJjRFPX5tDhwbogbHv0HF2JayWkywzNMugOT2qyaPkgabgNBzYQ5XJ6tqsI1YIzLNKIG8qyQ4Ue';

    const url = "https://www.icarry.in/api_login";

    console.log(`\nTesting POST to ${url}...`);
    try {
        const loginRes = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "application/json"
            },
            body: new URLSearchParams({ username, Key: key }).toString(),
        });

        console.log("Status:", loginRes.status);
        const text = await loginRes.text();
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch threw error:", e.message);
    }
}

testIcarry();
