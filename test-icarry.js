const username = "ela13167";
const key = "i0juPVMiqDihdQMUxZNQPhViPlXuiyQmHsCmNBAV3cncCpfNqTgLjOPa6fiXWMsS1rZMpgQm8NAXoY2JwTSCfZ6NrlOOVJvwWsHwlsDLxf64tSQVErJFHjOkTPyaevRDrXk6CwlXq003aAiufaw6GAYc1k6DxZh6LJgCllFCgLm4KGjhy5tuAAJjRFPX5tDhwbogbHv0HF2JayWkywzNMugOT2qyaPkgabgNBzYQ5XJ6tqsI1YIzLNKIG8qyQ4Ue";

async function run() {
    const loginRes = await fetch("https://www.icarry.in/api_login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, Key: key }),
    });
    const loginData = await loginRes.json();
    console.log("Token:", loginData.api_token);

    // try GET endpoints
    const endpoints = [
        "api_pickup_addresses",
        "api_pickup_address_list",
        "api_get_pickup_addresses",
        "api_profile",
        "api_address_list",
        "api_get_pickup_address"
    ];

    for (const ep of endpoints) {
        try {
            const res = await fetch(`https://www.icarry.in/${ep}?api_token=${loginData.api_token}`, {
                method: "GET"
            });
            const text = await res.text();
            console.log(`GET Endpoint ${ep}:`, text.substring(0, 100));
        } catch (e) {
            console.log(`GET Endpoint ${ep} failed:`, e.message);
        }
    }
}
run();
